'use strict';

/* admin.js — Filementor admin paneli
   Bağımlılıklar (bu sırayla admin.html'e eklenmeli):
     js/api-config.js  -> window.FILEMENTOR_API_BASE
     js/admin-guard.js -> window.__ADMIN_READY (oturum kontrolü)
     js/products.js    -> fetchProducts/getProducts/createProduct/updateProductOnServer/
                          deleteProductOnServer/fileToBase64
*/

const ADMIN_API_BASE = window.FILEMENTOR_API_BASE || '';

const STATUS_LABELS = { active: 'Satışta', out: 'Stokta Yok', draft: 'Taslak' };
const ORDER_STATUS_LABELS = { pending: 'Bekliyor', paid: 'Ödendi', failed: 'Başarısız' };

let ordersCache = [];
let pendingImageDataUrl = '';

/* ───────────── Görünüm (sekme) değiştirme ───────────── */

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(li => {
    li.classList.toggle('active', li.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(section => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  if (view === 'dashboard') renderDashboard();
  if (view === 'orders') renderOrdersTable();
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(li => {
    li.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(li.dataset.view);
    });
  });
}

/* ───────────── Yardımcılar ───────────── */

function formatCurrency(amount) {
  return '₺' + Number(amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

function shortId(id) {
  return String(id || '').slice(0, 8).toUpperCase();
}

/* ───────────── Ürünler ───────────── */

async function loadProducts() {
  await fetchProducts();
  renderProducts(getProducts());
}

function renderProducts(items) {
  const tbody = document.getElementById('productTableBody');
  const empty = document.getElementById('productsEmpty');
  if (!tbody) return;
  tbody.replaceChildren();

  if (!items || items.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  items.forEach(p => {
    const tr = document.createElement('tr');
    tr.dataset.id = String(p.id);

    const tdProduct = document.createElement('td');
    const infoDiv = document.createElement('div');
    infoDiv.className = 'product-info-cell';

    const img = document.createElement('img');
    img.src = p.image || p.imageUrl || '';
    img.alt = p.name;
    img.className = 'product-thumb';
    img.onerror = () => { img.style.visibility = 'hidden'; };

    const titleSpan = document.createElement('span');
    titleSpan.textContent = p.name;

    infoDiv.appendChild(img);
    infoDiv.appendChild(titleSpan);
    tdProduct.appendChild(infoDiv);

    const tdCat = document.createElement('td');
    tdCat.textContent = p.cat || p.category || '';

    const tdPrice = document.createElement('td');
    tdPrice.textContent = formatCurrency(p.price);

    const tdStock = document.createElement('td');
    const stockDiv = document.createElement('div');
    stockDiv.className = 'stock-control';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'btn-qty';
    btnMinus.textContent = '-';
    btnMinus.addEventListener('click', () => changeStock(p, -1));

    const stockVal = document.createElement('span');
    stockVal.className = 'stock-val';
    stockVal.textContent = String(p.stock);

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'btn-qty';
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => changeStock(p, 1));

    stockDiv.appendChild(btnMinus);
    stockDiv.appendChild(stockVal);
    stockDiv.appendChild(btnPlus);
    tdStock.appendChild(stockDiv);

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge-status badge-${p.status || 'active'}`;
    badge.textContent = STATUS_LABELS[p.status] || STATUS_LABELS.active;
    tdStatus.appendChild(badge);

    const tdAction = document.createElement('td');
    const btnGroup = document.createElement('div');
    btnGroup.className = 'action-btn-group';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-action';
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Düzenle';
    btnEdit.addEventListener('click', () => openEditProductModal(p));

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn-action';
    btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i> Sil';
    btnDelete.addEventListener('click', () => deleteProduct(p.id));

    btnGroup.appendChild(btnEdit);
    btnGroup.appendChild(btnDelete);
    tdAction.appendChild(btnGroup);

    tr.appendChild(tdProduct);
    tr.appendChild(tdCat);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

function resetImagePicker() {
  pendingImageDataUrl = '';
  document.getElementById('pImageData').value = '';
  document.getElementById('pImagePreview').src = '';
  document.getElementById('pImagePreview').style.display = 'none';
  document.getElementById('imageUploadStatus').textContent = '';
}

function openAddProductModal() {
  const form = document.getElementById('productForm');
  if (form) form.reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('pStatus').value = 'active';
  resetImagePicker();
  document.getElementById('formError').textContent = '';
  document.getElementById('modalTitle').textContent = 'Yeni Ürün Ekle';
  document.getElementById('productModal').classList.add('active');
}

function openEditProductModal(product) {
  document.getElementById('editProductId').value = String(product.id);
  document.getElementById('pName').value = product.name || '';
  document.getElementById('pCategory').value = product.cat || product.category || '';
  document.getElementById('pPrice').value = product.price;
  document.getElementById('pStock').value = product.stock;
  document.getElementById('pStatus').value = product.status || 'active';
  document.getElementById('formError').textContent = '';

  pendingImageDataUrl = product.image || product.imageUrl || '';
  document.getElementById('pImageData').value = pendingImageDataUrl;
  const preview = document.getElementById('pImagePreview');
  if (pendingImageDataUrl) {
    preview.src = pendingImageDataUrl;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
  document.getElementById('imageUploadStatus').textContent = '';

  document.getElementById('modalTitle').textContent = 'Ürünü Düzenle';
  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

async function handleImageFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const status = document.getElementById('imageUploadStatus');
  status.textContent = 'Görsel işleniyor...';
  try {
    const dataUrl = await fileToBase64(file);
    pendingImageDataUrl = dataUrl;
    document.getElementById('pImageData').value = dataUrl;
    const preview = document.getElementById('pImagePreview');
    preview.src = dataUrl;
    preview.style.display = 'block';
    status.textContent = 'Görsel hazır — kaydedince yüklenecek.';
  } catch (err) {
    status.textContent = 'Görsel yüklenemedi: ' + err.message;
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('formError');
  errorEl.textContent = '';

  const submitBtn = document.getElementById('btnSubmitProduct');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Kaydediliyor...';

  const id = document.getElementById('editProductId').value;
  const payload = {
    name: document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    price: parseFloat(document.getElementById('pPrice').value) || 0,
    stock: parseInt(document.getElementById('pStock').value, 10) || 0,
    status: document.getElementById('pStatus').value,
    imageUrl: pendingImageDataUrl || '',
  };

  try {
    const result = id
      ? await updateProductOnServer(id, payload)
      : await createProduct(payload);

    if (!result || result.success === false) {
      errorEl.textContent = (result && result.message) || 'Ürün kaydedilemedi.';
      return;
    }

    await loadProducts();
    closeProductModal();
  } catch (err) {
    errorEl.textContent = 'Sunucuya bağlanılamadı.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kaydet';
  }
}

async function changeStock(product, delta) {
  const newStock = Math.max(0, product.stock + delta);
  const result = await updateProductOnServer(product.id, {
    name: product.name,
    category: product.cat || product.category,
    price: product.price,
    stock: newStock,
    status: newStock === 0 ? 'out' : (product.status === 'out' ? 'active' : product.status),
    imageUrl: product.image || product.imageUrl || '',
  });
  if (result && result.success !== false) {
    await loadProducts();
  }
}

async function deleteProduct(id) {
  if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  const result = await deleteProductOnServer(id);
  if (result && result.success !== false) {
    await loadProducts();
  }
}

/* ───────────── Siparişler ───────────── */

async function loadOrders() {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/api/admin/orders`, { credentials: 'include' });
    if (!res.ok) throw new Error('Siparişler alınamadı: ' + res.status);
    const data = await res.json();
    ordersCache = data.orders || [];
  } catch (err) {
    console.error(err);
    ordersCache = [];
  }
}

function renderOrderRow(order) {
  const tr = document.createElement('tr');
  const cells = [
    shortId(order.id),
    order.customerName || '–',
    order.customerEmail || '–',
    formatCurrency((order.amountCents || 0) / 100),
    '',
    formatDate(order.createdAt),
  ];
  cells.forEach((text, i) => {
    const td = document.createElement('td');
    if (i === 4) {
      const badge = document.createElement('span');
      badge.className = `badge-status badge-order-${order.status}`;
      badge.textContent = ORDER_STATUS_LABELS[order.status] || order.status;
      td.appendChild(badge);
    } else {
      td.textContent = text;
    }
    tr.appendChild(td);
  });
  return tr;
}

function renderOrdersTable(filter = '') {
  const tbody = document.getElementById('orderTableBody');
  const empty = document.getElementById('ordersEmpty');
  if (!tbody) return;
  tbody.replaceChildren();

  const query = filter.trim().toLowerCase();
  const filtered = query
    ? ordersCache.filter(o =>
        (o.customerName || '').toLowerCase().includes(query) ||
        (o.id || '').toLowerCase().includes(query))
    : ordersCache;

  if (filtered.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  filtered.forEach(order => {
    const tr = renderOrderRow(order);
    // Sipariş tablosunda e-posta sütunu var; dashboard'da yok, bu yüzden burada tam satır kullanılıyor.
    tbody.appendChild(tr);
  });
}

/* ───────────── Dashboard ───────────── */

function renderDashboard() {
  const products = getProducts();
  const productCount = products.length;
  const outOfStock = products.filter(p => p.status === 'out' || p.stock === 0).length;

  const paidOrders = ordersCache.filter(o => o.status === 'paid');
  const revenue = paidOrders.reduce((sum, o) => sum + (o.amountCents || 0), 0) / 100;
  const pendingOrders = ordersCache.filter(o => o.status === 'pending').length;

  document.getElementById('statProductCount').textContent = productCount;
  document.getElementById('statOutOfStock').textContent = outOfStock;
  document.getElementById('statRevenue').textContent = formatCurrency(revenue);
  document.getElementById('statPendingOrders').textContent = pendingOrders;

  const recentBody = document.getElementById('recentOrdersBody');
  const recentEmpty = document.getElementById('recentOrdersEmpty');
  recentBody.replaceChildren();
  const recent = ordersCache.slice(0, 6);
  if (recent.length === 0) {
    recentEmpty.style.display = 'block';
  } else {
    recentEmpty.style.display = 'none';
    recent.forEach(order => {
      const tr = document.createElement('tr');
      [shortId(order.id), order.customerName || '–', formatCurrency((order.amountCents || 0) / 100)]
        .forEach(text => {
          const td = document.createElement('td');
          td.textContent = text;
          tr.appendChild(td);
        });
      const statusTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge-status badge-order-${order.status}`;
      badge.textContent = ORDER_STATUS_LABELS[order.status] || order.status;
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);
      const dateTd = document.createElement('td');
      dateTd.textContent = formatDate(order.createdAt);
      tr.appendChild(dateTd);
      recentBody.appendChild(tr);
    });
  }
}

/* ───────────── Başlangıç ───────────── */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.__ADMIN_READY) {
    const session = await window.__ADMIN_READY;
    if (!session) return; // admin-guard zaten login.html'e yönlendirdi
    const whoami = document.getElementById('adminWhoami');
    if (whoami && session.username) whoami.textContent = session.username;
  }

  setupNav();

  document.getElementById('btnOpenAddModal')?.addEventListener('click', openAddProductModal);
  document.getElementById('btnCloseModal')?.addEventListener('click', closeProductModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeProductModal);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('pImageFile')?.addEventListener('change', handleImageFileSelect);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof adminLogout === 'function') adminLogout();
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = getProducts().filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.cat || p.category || '').toLowerCase().includes(query));
    renderProducts(filtered);
  });

  document.getElementById('orderSearchInput')?.addEventListener('input', (e) => {
    renderOrdersTable(e.target.value);
  });

  window.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (e.target === modal) closeProductModal();
  });

  await Promise.all([loadProducts(), loadOrders()]);
  renderDashboard();
});

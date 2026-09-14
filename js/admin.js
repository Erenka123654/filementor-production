'use strict';

(() => {

const state = {
  products: [],
  orders: [],
  editingId: null,
  imageData: ''
};

const API_BASE = window.FILEMENTOR_API_BASE || '';

function byId(id) {
  return document.getElementById(id);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = String(text);
  return el;
}

function moneyFromOrder(order) {
  if (Number.isFinite(Number(order.amountCents))) {
    return Number(order.amountCents) / 100;
  }
  if (Number.isFinite(Number(order.amount))) {
    return Number(order.amount);
  }
  if (Number.isFinite(Number(order.total))) {
    return Number(order.total);
  }
  return 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('tr-TR');
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['paid', 'active'].includes(value)) return value;
  if (['pending', 'draft'].includes(value)) return value;
  if (['failed', 'out'].includes(value)) return value;
  return value || 'draft';
}

function statusLabel(status) {
  const labels = {
    active: 'Satışta',
    out: 'Stokta yok',
    draft: 'Taslak',
    paid: 'Ödendi',
    pending: 'Bekliyor',
    failed: 'Başarısız'
  };
  return labels[normalizeStatus(status)] || String(status || '—');
}

function showToast(message) {
  const toast = byId('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setEmptyState(id, visible) {
  byId(id)?.classList.toggle('visible', Boolean(visible));
}

function setView(name) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${name}`);
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  const titles = {
    dashboard: 'Genel Bakış',
    products: 'Ürünler',
    orders: 'Siparişler'
  };

  const heading = byId('pageHeading');
  if (heading) heading.textContent = titles[name] || 'Filementor';
}

function productImage(product) {
  if (product.image) {
    const img = createEl('img', 'product-thumb');
    img.src = product.image;
    img.alt = product.name || 'Ürün görseli';
    return img;
  }
  return createEl('span', 'product-placeholder', product.emoji || '📦');
}

function productCell(product) {
  const wrap = createEl('div', 'product-cell');
  wrap.append(productImage(product), createEl('span', 'product-name', product.name || 'İsimsiz ürün'));
  return wrap;
}

function statusBadge(status) {
  const normalized = normalizeStatus(status);
  return createEl('span', `status-badge status-${normalized}`, statusLabel(normalized));
}

function actionButton(label, handler, danger = false) {
  const button = createEl('button', `action-button${danger ? ' danger' : ''}`, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function renderProducts(query = '') {
  const tbody = byId('productTableBody');
  if (!tbody) return;

  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  const filtered = state.products.filter((product) => {
    const name = String(product.name || '').toLocaleLowerCase('tr-TR');
    const category = String(product.cat || product.category || '').toLocaleLowerCase('tr-TR');
    return !normalized || name.includes(normalized) || category.includes(normalized);
  });

  tbody.replaceChildren();
  setEmptyState('productsEmpty', filtered.length === 0);

  for (const product of filtered) {
    const row = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.append(productCell(product));

    const categoryTd = createEl('td', '', product.cat || product.category || '—');
    const priceTd = createEl('td', '', formatMoney(product.price));
    const stockTd = createEl('td', '', product.stock ?? 0);

    const statusTd = document.createElement('td');
    statusTd.append(statusBadge(product.status));

    const actionsTd = document.createElement('td');
    const actions = createEl('div', 'action-group');
    actions.append(
      actionButton('Düzenle', () => openProductModal(product)),
      actionButton('Sil', () => removeProduct(product.id), true)
    );
    actionsTd.append(actions);

    row.append(nameTd, categoryTd, priceTd, stockTd, statusTd, actionsTd);
    tbody.append(row);
  }
}

function renderOrders() {
  const tbody = byId('orderTableBody');
  if (!tbody) return;

  const query = String(byId('orderSearchInput')?.value || '').trim().toLocaleLowerCase('tr-TR');
  const filtered = state.orders.filter((order) => {
    const id = String(order.id || order.orderId || '').toLocaleLowerCase('tr-TR');
    const name = String(order.customerName || order.customer_name || '').toLocaleLowerCase('tr-TR');
    const email = String(order.customerEmail || order.customer_email || '').toLocaleLowerCase('tr-TR');
    return !query || id.includes(query) || name.includes(query) || email.includes(query);
  });

  tbody.replaceChildren();
  setEmptyState('ordersEmpty', filtered.length === 0);

  for (const order of filtered) {
    const row = document.createElement('tr');
    const id = String(order.id || order.orderId || '—');
    const name = order.customerName || order.customer_name || '—';
    const email = order.customerEmail || order.customer_email || '—';

    const statusTd = document.createElement('td');
    statusTd.append(statusBadge(order.status));

    row.append(
      createEl('td', '', id.length > 12 ? id.slice(0, 12) : id),
      createEl('td', '', name),
      createEl('td', '', email),
      createEl('td', '', formatMoney(moneyFromOrder(order))),
      statusTd,
      createEl('td', '', formatDate(order.createdAt || order.created_at))
    );
    tbody.append(row);
  }
}

function renderDashboard() {
  const outOfStock = state.products.filter((p) => p.status === 'out' || Number(p.stock) <= 0).length;
  const pending = state.orders.filter((order) => normalizeStatus(order.status) === 'pending').length;
  const revenue = state.orders
    .filter((order) => normalizeStatus(order.status) === 'paid')
    .reduce((sum, order) => sum + moneyFromOrder(order), 0);

  byId('statProductCount').textContent = String(state.products.length);
  byId('statOutOfStock').textContent = String(outOfStock);
  byId('statRevenue').textContent = formatMoney(revenue);
  byId('statPendingOrders').textContent = String(pending);

  const tbody = byId('recentOrdersBody');
  if (!tbody) return;

  const recent = [...state.orders]
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
    .slice(0, 5);

  tbody.replaceChildren();
  setEmptyState('recentOrdersEmpty', recent.length === 0);

  for (const order of recent) {
    const row = document.createElement('tr');
    const statusTd = document.createElement('td');
    statusTd.append(statusBadge(order.status));

    const id = String(order.id || order.orderId || '—');

    row.append(
      createEl('td', '', id.length > 12 ? id.slice(0, 12) : id),
      createEl('td', '', order.customerName || order.customer_name || '—'),
      createEl('td', '', formatMoney(moneyFromOrder(order))),
      statusTd,
      createEl('td', '', formatDate(order.createdAt || order.created_at))
    );
    tbody.append(row);
  }
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Siparişler yüklenemedi.');

    const data = await response.json();
    state.orders = Array.isArray(data) ? data : (Array.isArray(data.orders) ? data.orders : []);
  } catch (error) {
    console.error('Siparişler yüklenemedi:', error);
    throw error;
  }
}

async function refreshAll() {
  const errors = [];
  byId('btnRefresh').disabled = true;
  try {
    await fetchProducts({ strict: true });
    state.products = getProducts();
  } catch (error) {
    console.error('Ürünler yüklenemedi:', error);
    errors.push('Ürünler yüklenemedi.');
  }

  try {
    await loadOrders();
  } catch {
    errors.push('Siparişler yüklenemedi.');
  }
  renderProducts(byId('searchInput')?.value || '');
  renderOrders();
  renderDashboard();
  byId('loadError').textContent = errors.length
    ? `${errors.join(' ')} Görünen veriler güncel olmayabilir. Yenile düğmesiyle tekrar deneyin.`
    : '';
  byId('btnRefresh').disabled = false;
}

function resetForm() {
  state.editingId = null;
  state.imageData = '';
  byId('editProductId').value = '';
  byId('pImageData').value = '';
  byId('pName').value = '';
  byId('pCategory').value = '';
  byId('pPrice').value = '';
  byId('pStock').value = '1';
  byId('pStatus').value = 'active';
  byId('pImageFile').value = '';
  byId('imageUploadStatus').textContent = '';
  byId('formError').textContent = '';
  byId('pImagePreview').removeAttribute('src');
  byId('pImagePreview').classList.remove('visible');
}

function openProductModal(product = null) {
  resetForm();

  if (product) {
    state.editingId = product.id;
    state.imageData = product.image || '';

    byId('editProductId').value = String(product.id ?? '');
    byId('pImageData').value = state.imageData;
    byId('pName').value = product.name || '';
    byId('pCategory').value = product.cat || product.category || '';
    byId('pPrice').value = product.price ?? '';
    byId('pStock').value = product.stock ?? 0;
    byId('pStatus').value = product.status || 'active';
    byId('modalTitle').textContent = 'Ürünü düzenle';

    if (state.imageData) {
      byId('pImagePreview').src = state.imageData;
      byId('pImagePreview').classList.add('visible');
    }
  } else {
    byId('modalTitle').textContent = 'Yeni ürün ekle';
  }

  byId('productModal').classList.add('open');
  byId('productModal').setAttribute('aria-hidden', 'false');
  byId('pName').focus();
}

function closeProductModal() {
  byId('productModal').classList.remove('open');
  byId('productModal').setAttribute('aria-hidden', 'true');
}

async function handleImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  byId('imageUploadStatus').textContent = 'Görsel hazırlanıyor...';
  byId('btnSubmitProduct').disabled = true;

  try {
    state.imageData = await fileToBase64(file);
    byId('pImageData').value = state.imageData;
    byId('pImagePreview').src = state.imageData;
    byId('pImagePreview').classList.add('visible');
    byId('imageUploadStatus').textContent = 'Görsel hazır.';
  } catch (error) {
    console.error(error);
    event.target.value = '';
    byId('imageUploadStatus').textContent = error.message || 'Görsel işlenemedi.';
  } finally {
    byId('btnSubmitProduct').disabled = false;
  }
}

async function submitProduct(event) {
  event.preventDefault();

  const name = byId('pName').value.trim();
  const cat = byId('pCategory').value.trim();
  const price = Number(byId('pPrice').value);
  const stock = Number(byId('pStock').value);
  const status = byId('pStatus').value;

  byId('formError').textContent = '';

  if (!name || !cat || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    byId('formError').textContent = 'Lütfen zorunlu alanları geçerli bilgilerle doldurun.';
    return;
  }

  const existing = state.products.find((p) => String(p.id) === String(state.editingId));

  const payload = {
    name,
    cat,
    price,
    stock,
    status,
    image: state.imageData || null,
    emoji: existing?.emoji || '📦',
    desc: existing?.desc || '',
    isNew: Boolean(existing?.isNew)
  };

  const submitButton = byId('btnSubmitProduct');
  submitButton.disabled = true;
  submitButton.textContent = 'Kaydediliyor...';

  try {
    let result;
    if (state.editingId !== null) {
      result = await updateProductOnServer(state.editingId, payload);
    } else {
      result = await createProduct(payload);
    }

    if (result?.success === false) {
      throw new Error(result.message || 'Ürün kaydedilemedi.');
    }

    closeProductModal();
    await refreshAll();
    showToast(state.editingId !== null ? 'Ürün güncellendi.' : 'Ürün eklendi.');
  } catch (error) {
    console.error(error);
    byId('formError').textContent = error.message || 'Ürün kaydedilemedi.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Kaydet';
  }
}

async function removeProduct(id) {
  const product = state.products.find((item) => String(item.id) === String(id));
  const confirmed = window.confirm(`"${product?.name || 'Bu ürün'}" silinsin mi?`);
  if (!confirmed) return;

  try {
    const result = await deleteProductOnServer(id);
    if (result?.success === false) {
      throw new Error(result.message || 'Ürün silinemedi.');
    }
    await refreshAll();
    showToast('Ürün silindi.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Ürün silinemedi.');
  }
}

function bindEvents() {
  byId('btnRefresh')?.addEventListener('click', refreshAll);
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  byId('searchInput')?.addEventListener('input', (event) => renderProducts(event.target.value));
  byId('orderSearchInput')?.addEventListener('input', renderOrders);
  byId('btnOpenAddModal')?.addEventListener('click', () => openProductModal());
  byId('btnCloseModal')?.addEventListener('click', closeProductModal);
  byId('btnCancelModal')?.addEventListener('click', closeProductModal);
  byId('productForm')?.addEventListener('submit', submitProduct);
  byId('pImageFile')?.addEventListener('change', handleImageChange);

  byId('productModal')?.addEventListener('click', (event) => {
    if (event.target === byId('productModal')) closeProductModal();
  });

  byId('btnLogout')?.addEventListener('click', () => {
    if (typeof adminLogout === 'function') adminLogout();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProductModal();
  });
}

async function boot() {
  if (window.__ADMIN_READY) {
    const session = await window.__ADMIN_READY;
    if (!session) return;
  }

  if (window.__ADMIN_USERNAME) {
    byId('adminWhoami').textContent = window.__ADMIN_USERNAME;
  }

  bindEvents();
  setView('products');
  await refreshAll();
}

document.addEventListener('DOMContentLoaded', boot);
})();

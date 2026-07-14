'use strict';

let editingId = null;
let selectedEmoji = '📦';
let pendingImage = null;
let currentSection = 'dashboard';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value); }
function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
function statusLabel(status) { return { active: 'Satışta', out: 'Stok Yok', draft: 'Taslak' }[status] || status; }

function productVisual(product, size) {
  const visual = product.image ? document.createElement('img') : node('span', '', product.emoji || '📦');
  if (product.image) { visual.src = product.image; visual.alt = product.name; }
  Object.assign(visual.style, { width: `${size}px`, height: `${size}px`, objectFit: 'cover', borderRadius: '8px', flexShrink: '0' });
  return visual;
}

function showSection(name) {
  ['dashboard', 'products', 'orders'].forEach(section => {
    const el = document.getElementById(`section-${section}`);
    if (el) el.style.display = section === name ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.toggle('active', link.dataset.section === name));
  setText('section-title', { dashboard: 'Dashboard', products: 'Ürünler', orders: 'Siparişler' }[name] || name);
  const addButton = document.getElementById('add-btn');
  if (addButton) addButton.style.display = name === 'products' ? '' : 'none';
  currentSection = name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'products') renderProductsTable();
  if (name === 'orders') renderOrders();
}

async function renderOrders() {
  const tbody = document.getElementById('orders-tbody'); if (!tbody) return;
  tbody.replaceChildren(node('tr', '', ''));
  try {
    const response = await fetch(`${window.FILEMENTOR_API_BASE || ''}/api/admin/orders`, { credentials: 'include' });
    if (!response.ok) throw new Error('Siparişler alınamadı.');
    const { orders = [] } = await response.json();
    if (!orders.length) {
      const row = document.createElement('tr'); const cell = node('td', '', 'Henüz sipariş yok.'); cell.colSpan = 5; row.append(cell); tbody.replaceChildren(row); return;
    }
    tbody.replaceChildren(...orders.map(order => {
      const row = document.createElement('tr');
      const status = { paid: 'Ödendi', pending: 'Bekliyor', failed: 'Başarısız' }[order.status] || order.status;
      row.append(
        node('td', '', String(order.id).slice(0, 8)),
        node('td', '', `${order.customerName} (${order.customerEmail})`),
        node('td', '', `₺${(Number(order.amountCents) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`),
        node('td', '', status),
        node('td', '', new Date(order.createdAt).toLocaleString('tr-TR'))
      );
      return row;
    }));
  } catch {
    const row = document.createElement('tr'); const cell = node('td', '', 'Siparişler yüklenemedi.'); cell.colSpan = 5; row.append(cell); tbody.replaceChildren(row);
  }
}

function renderDashboard() {
  const products = getProducts();
  setText('d-total', products.length);
  setText('d-active', products.filter(p => p.status === 'active' && Number(p.stock) > 0).length);
  setText('d-out', products.filter(p => p.status === 'out' || Number(p.stock) <= 0).length);
  setText('d-cats', new Set(products.map(p => p.cat)).size);
  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;
  tbody.replaceChildren(...[...products].reverse().slice(0, 5).map(product => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.append(productVisual(product, 32), node('strong', '', product.name));
    const statusCell = document.createElement('td');
    statusCell.append(node('span', `status-pill status-${product.status}`, statusLabel(product.status)));
    row.append(nameCell, node('td', '', product.cat), node('td', '', `₺${Number(product.price).toLocaleString('tr-TR')}`), stockControls(product), statusCell);
    return row;
  }));
}

function renderProductsTable(query = '') {
  const normalizedQuery = query.toLocaleLowerCase('tr-TR');
  const products = getProducts().filter(product => !normalizedQuery ||
    product.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
    product.cat.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  if (!products.length) {
    const row = document.createElement('tr');
    const cell = node('td', '', 'Ürün bulunamadı.'); cell.colSpan = 6;
    Object.assign(cell.style, { textAlign: 'center', color: '#aaa', padding: '2rem' });
    row.append(cell); tbody.replaceChildren(row); return;
  }
  tbody.replaceChildren(...products.map(product => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    Object.assign(nameCell.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' });
    nameCell.append(productVisual(product, 40), node('strong', '', product.name));
    const statusCell = document.createElement('td');
    statusCell.append(node('span', `status-pill status-${product.status}`, statusLabel(product.status)));
    const stockCell = stockControls(product);
    const actions = document.createElement('td'); actions.style.whiteSpace = 'nowrap';
    const edit = node('button', 'tbl-btn', '✏️ Düzenle'); edit.type = 'button'; edit.addEventListener('click', () => editProduct(product.id));
    const remove = node('button', 'tbl-btn tbl-btn-del', '🗑 Sil'); remove.type = 'button'; remove.style.marginLeft = '4px'; remove.addEventListener('click', () => deleteProduct(product.id));
    actions.append(edit, remove);
    row.append(nameCell, node('td', '', product.cat), node('td', '', `₺${Number(product.price).toLocaleString('tr-TR')}`), stockCell, statusCell, actions);
    return row;
  }));
}

function filterProducts() { renderProductsTable(document.getElementById('search-input')?.value || ''); }

function stockControls(product) {
  const cell = document.createElement('td');
  const decrease = node('button', 'tbl-btn', '−'); decrease.type = 'button'; decrease.title = 'Stok azalt';
  decrease.disabled = Number(product.stock) <= 0; decrease.addEventListener('click', () => adjustStock(product, -1));
  const value = node('strong', '', product.stock ?? 0);
  Object.assign(value.style, { display: 'inline-block', minWidth: '34px', textAlign: 'center' });
  const increase = node('button', 'tbl-btn', '+'); increase.type = 'button'; increase.title = 'Stok artır';
  increase.addEventListener('click', () => adjustStock(product, 1));
  cell.append(decrease, value, increase);
  return cell;
}

function openModal(product = null) {
  editingId = product?.id ?? null;
  pendingImage = product?.image || null;
  setText('modal-title', product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle');
  setValue('f-name', product?.name || ''); setValue('f-price', product?.price || '');
  setValue('f-stock', product?.stock ?? 1);
  setValue('f-cat', product?.cat || ''); setValue('f-desc', product?.desc || '');
  setValue('f-status', product?.status || 'active'); setValue('f-new', String(Boolean(product?.isNew)));
  buildEmojiGrid(product?.emoji || '📦'); renderImagePreview();
  document.getElementById('modal-overlay')?.classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay')?.classList.remove('open'); editingId = null; pendingImage = null; }

function buildEmojiGrid(selected) {
  selectedEmoji = selected;
  const grid = document.getElementById('emoji-grid'); if (!grid) return;
  grid.replaceChildren(...EMOJIS.map(emoji => {
    const option = node('button', `emoji-opt${emoji === selected ? ' selected' : ''}`, emoji);
    option.type = 'button'; option.addEventListener('click', () => selectEmoji(emoji)); return option;
  }));
}

function selectEmoji(emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-opt').forEach(el => el.classList.toggle('selected', el.textContent === emoji));
}

function renderImagePreview() {
  const wrap = document.getElementById('img-preview-wrap'); if (!wrap) return;
  if (pendingImage) {
    const box = node('div', 'img-preview-box');
    const image = node('img', 'img-preview-thumb'); image.src = pendingImage; image.alt = 'Ürün resmi';
    const remove = node('button', 'img-remove-btn', '✕'); remove.type = 'button'; remove.title = 'Resmi kaldır'; remove.addEventListener('click', removeImage);
    box.append(image, remove);
    const hint = node('p', 'img-hint', 'Değiştirmek için yeni dosya seç');
    const label = node('label', 'img-upload-label', '📂 Farklı resim seç'); label.htmlFor = 'f-image';
    wrap.replaceChildren(box, hint, label);
  } else {
    const label = node('label', 'img-drop-zone'); label.htmlFor = 'f-image'; label.id = 'drop-zone';
    label.append(node('span', 'drop-icon', '🖼️'), node('span', 'drop-text', 'JPG, PNG veya WEBP yükle'), node('span', 'drop-sub', 'Tıkla veya sürükle bırak • Maks 50 MB • Otomatik sıkıştırılır'));
    wrap.replaceChildren(label); setupDropZone();
  }
}

function setupDropZone() {
  const zone = document.getElementById('drop-zone'); if (!zone) return;
  zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('drag-over'); const file = event.dataTransfer.files[0]; if (file) handleImageFile(file); });
}

async function handleImageFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Yalnızca JPG, PNG veya WEBP seçebilirsiniz.'); return; }
  if (file.size > 50 * 1024 * 1024) { alert('Kaynak görsel 50 MB’dan büyük olamaz.'); return; }
  try {
    const encoded = await fileToBase64(file);
    if (encoded.length > 700000) throw new Error('Görsel çok büyük.');
    pendingImage = encoded; renderImagePreview();
  } catch { alert('Resim işlenemedi veya güvenli boyuta sıkıştırılamadı. Başka bir görsel deneyin.'); }
}

function removeImage() { pendingImage = null; renderImagePreview(); }

async function saveProduct() {
  const name = document.getElementById('f-name')?.value.trim();
  const price = Number(document.getElementById('f-price')?.value);
  const stock = Number(document.getElementById('f-stock')?.value);
  const cat = document.getElementById('f-cat')?.value.trim();
  const desc = document.getElementById('f-desc')?.value.trim() || '';
  const status = document.getElementById('f-status')?.value;
  const isNew = document.getElementById('f-new')?.value === 'true';
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !cat) { alert('Zorunlu alanları geçerli değerlerle doldurun.'); return; }
  const payload = { name, price, stock, cat, desc, status, isNew, emoji: selectedEmoji, image: pendingImage };
  const wasEditing = editingId !== null;
  try {
    const result = wasEditing ? await updateProductOnServer(editingId, payload) : await createProduct(payload);
    if (!result.success) { alert(result.message || 'Ürün kaydedilemedi.'); return; }
    await fetchProducts(); closeModal(); renderDashboard(); if (currentSection === 'products') renderProductsTable();
    showToast(wasEditing ? 'Ürün güncellendi ✓' : 'Yeni ürün eklendi ✓');
  } catch (error) { console.error(error); alert('Sunucuya bağlanılamadı.'); }
}

function editProduct(id) { const product = getProducts().find(item => String(item.id) === String(id)); if (product) openModal(product); }
async function adjustStock(product, delta) {
  const currentStock = Number(product.stock) || 0;
  const stock = Math.max(0, currentStock + delta);
  if (!Number.isInteger(stock) || stock > 1000000 || stock === currentStock) return;
  const status = stock === 0 ? 'out' : (product.status === 'draft' ? 'draft' : 'active');
  const payload = {
    name: product.name, price: Number(product.price), stock, cat: product.cat,
    desc: product.desc || '', status, isNew: Boolean(product.isNew),
    emoji: product.emoji || '📦', image: product.image || null
  };
  try {
    const result = await updateProductOnServer(product.id, payload);
    if (!result.success) throw new Error(result.message || 'Stok güncellenemedi.');
    await fetchProducts(); renderProductsTable(document.getElementById('search-input')?.value || ''); renderDashboard();
    showToast(`Stok ${stock} olarak güncellendi.`);
  } catch (error) { console.error(error); alert(error.message || 'Stok güncellenemedi.'); }
}
async function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
  try { const result = await deleteProductOnServer(id); if (!result.success) throw new Error(result.message); await fetchProducts(); renderProductsTable(); renderDashboard(); showToast('Ürün silindi.'); }
  catch (error) { console.error(error); alert('Ürün silinemedi.'); }
}

let toastTimer;
function showToast(message) { const el = document.getElementById('toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800); }

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showSection(link.dataset.section); }));
  document.addEventListener('change', event => { if (event.target.id === 'f-image' && event.target.files[0]) handleImageFile(event.target.files[0]); });
  await fetchProducts(); showSection('dashboard');
});

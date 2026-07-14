'use strict';

let cart = [];
let activeFilter = 'Tümü';
let lightboxProductId = null;
const CAT_COLORS = { Dekor: '#E1F5EE', Aydınlatma: '#FAEEDA', Hobi: '#E6F1FB', Oyuncak: '#FAECE7', Oyun: '#FBEAF0', Ev: '#EAF3DE' };

function storeNode(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}
function bgForCat(cat) { return CAT_COLORS[cat] || '#F0EEE8'; }
function sameId(left, right) { return String(left) === String(right); }
function money(value) { return `₺${Number(value).toLocaleString('tr-TR')}`; }

function renderFilters() {
  const row = document.getElementById('filter-row'); if (!row) return;
  const categories = ['Tümü', ...new Set(getProducts().map(product => product.cat).filter(Boolean))];
  row.replaceChildren(...categories.map(category => {
    const button = storeNode('button', `filter-chip${category === activeFilter ? ' active' : ''}`, category);
    button.type = 'button'; button.addEventListener('click', () => setFilter(category)); return button;
  }));
}
function setFilter(category) { activeFilter = category; renderFilters(); renderGrid(); }

function productVisual(product, className) {
  if (product.image) { const image = storeNode('img', className); image.src = product.image; image.alt = product.name; image.loading = 'lazy'; return image; }
  return storeNode('div', className || 'product-emoji-fallback', product.emoji || '📦');
}

function renderGrid() {
  const grid = document.getElementById('product-grid'); if (!grid) return;
  const visible = getProducts().filter(product => product.status !== 'draft' && (activeFilter === 'Tümü' || product.cat === activeFilter));
  if (!visible.length) { const empty = storeNode('p', '', 'Bu kategoride ürün bulunamadı.'); Object.assign(empty.style, { color: '#888', gridColumn: '1/-1', padding: '2rem 0' }); grid.replaceChildren(empty); return; }
  grid.replaceChildren(...visible.map(product => {
    const card = storeNode('article', 'product-card'); card.tabIndex = 0;
    const open = () => openLightbox(product.id); card.addEventListener('click', open); card.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
    const imageBox = storeNode('div', 'product-img'); if (!product.image) imageBox.style.background = bgForCat(product.cat);
    if (product.isNew) imageBox.append(storeNode('span', 'badge-new', 'YENİ'));
    if (product.status === 'out') imageBox.append(storeNode('span', 'badge-out', 'STOK YOK'));
    const zoom = storeNode('div', 'product-img-zoom'); zoom.append(productVisual(product, product.image ? 'product-photo' : 'product-emoji-fallback'));
    imageBox.append(zoom, storeNode('span', 'zoom-hint', '🔍 Büyüt'));
    const info = storeNode('div', 'product-info');
    info.append(storeNode('div', 'product-name', product.name), storeNode('div', 'product-cat', product.cat));
    if (product.desc) info.append(storeNode('div', 'product-desc', product.desc));
    const footer = storeNode('div', 'product-footer'); footer.append(storeNode('span', 'product-price', money(product.price)));
    if (product.status !== 'out') { const add = storeNode('button', 'add-cart-btn', '+'); add.type = 'button'; add.setAttribute('aria-label', 'Sepete ekle'); add.addEventListener('click', event => { event.stopPropagation(); addToCart(product.id); }); footer.append(add); }
    else footer.append(storeNode('span', '', '—'));
    info.append(footer); card.append(imageBox, info); return card;
  }));
}

function openLightbox(id) {
  const product = getProducts().find(item => sameId(item.id, id)); if (!product) return;
  lightboxProductId = product.id;
  const imageWrap = document.getElementById('lb-img-wrap');
  if (imageWrap) { const visual = productVisual(product, product.image ? '' : 'lb-emoji'); Object.assign(visual.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', background: product.image ? '' : bgForCat(product.cat) }); imageWrap.replaceChildren(visual); }
  const badges = document.getElementById('lb-badges');
  if (badges) badges.replaceChildren(...[product.isNew ? storeNode('span', 'lb-badge lb-badge-new', 'YENİ') : null, product.status === 'out' ? storeNode('span', 'lb-badge lb-badge-out', 'STOK YOK') : null].filter(Boolean));
  document.getElementById('lb-name').textContent = product.name; document.getElementById('lb-cat').textContent = product.cat;
  document.getElementById('lb-desc').textContent = product.desc || 'Açıklama eklenmemiş.'; document.getElementById('lb-price').textContent = money(product.price);
  const button = document.getElementById('lb-btn'); button.textContent = product.status === 'out' ? 'Stok Yok' : 'Sepete Ekle'; button.disabled = product.status === 'out'; button.style.opacity = button.disabled ? '.5' : '1';
  document.getElementById('lightbox').classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeLightbox() { document.getElementById('lightbox')?.classList.remove('open'); document.body.style.overflow = ''; lightboxProductId = null; }
function addFromLightbox() { if (lightboxProductId !== null) { addToCart(lightboxProductId); closeLightbox(); } }

function addToCart(id) {
  const product = getProducts().find(item => sameId(item.id, id)); if (!product || product.status === 'out') return;
  const existing = cart.find(item => sameId(item.id, id)); if (existing) existing.qty += 1; else cart.push({ ...product, qty: 1 });
  updateCartUI(); showToast(`“${product.name}” sepete eklendi 🛒`);
}
function removeFromCart(id) { cart = cart.filter(item => !sameId(item.id, id)); updateCartUI(); }
function changeQty(id, delta) { const item = cart.find(entry => sameId(entry.id, id)); if (!item) return; item.qty += delta; if (item.qty <= 0) removeFromCart(id); else updateCartUI(); }

function updateCartUI() {
  const count = document.getElementById('cart-count'); if (count) count.textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  const items = document.getElementById('cart-items'); const footer = document.getElementById('cart-footer');
  if (!items) return;
  if (!cart.length) { items.replaceChildren(storeNode('p', 'cart-empty', 'Sepetiniz boş.')); if (footer) footer.style.display = 'none'; return; }
  items.replaceChildren(...cart.map(item => {
    const row = storeNode('div', 'cart-item'); const thumb = storeNode('div', 'cart-item-thumb');
    const visual = productVisual(item, ''); Object.assign(visual.style, { width: '50px', height: '50px', objectFit: 'cover' }); thumb.append(visual);
    const info = storeNode('div', 'cart-item-info'); info.append(storeNode('div', 'cart-item-name', item.name), storeNode('div', 'cart-item-price', `${money(item.price)} x ${item.qty}`));
    const controls = storeNode('div', 'cart-item-qty');
    [['−', -1], ['+', 1]].forEach(([label, delta]) => { const button = storeNode('button', 'qty-btn', label); button.type = 'button'; button.addEventListener('click', () => changeQty(item.id, delta)); controls.append(button); });
    const quantity = storeNode('span', '', item.qty); Object.assign(quantity.style, { fontSize: '14px', fontWeight: '600', minWidth: '18px', textAlign: 'center' }); controls.insertBefore(quantity, controls.children[1]);
    const remove = storeNode('button', 'qty-btn', '🗑'); remove.type = 'button'; remove.title = 'Kaldır'; remove.addEventListener('click', () => removeFromCart(item.id)); controls.append(remove);
    row.append(thumb, info, controls); return row;
  }));
  const grand = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  ['cart-subtotal', 'cart-total'].forEach(id => { const element = document.getElementById(id); if (element) element.textContent = money(grand); });
  if (footer) footer.style.display = 'flex';
}

function toggleCart() { const drawer = document.getElementById('cart-drawer'); const overlay = document.getElementById('cart-overlay'); const open = drawer.classList.toggle('open'); overlay.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; }
function handleContact(event) {
  event.preventDefault();
  const email = String(window.FILEMENTOR_CONTACT_EMAIL || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('İletişim formu henüz etkin değil. Lütfen daha sonra tekrar deneyin.');
    return;
  }
  const form = event.currentTarget;
  const name = form.elements.namedItem('name')?.value.trim() || '';
  const replyTo = form.elements.namedItem('email')?.value.trim() || '';
  const detail = form.elements.namedItem('detail')?.value.trim() || '';
  const subject = encodeURIComponent(`Özel sipariş talebi - ${name}`);
  const body = encodeURIComponent(`Ad Soyad: ${name}\nE-posta: ${replyTo}\n\nSipariş detayı:\n${detail}`);
  window.location.assign(`mailto:${email}?subject=${subject}&body=${body}`);
}
let toastTimer;
function showToast(message) { const element = document.getElementById('toast'); if (!element) return; element.textContent = message; element.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('show'), 2800); }

document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeLightbox(); if (typeof closeCheckout === 'function') closeCheckout(); } });
document.addEventListener('DOMContentLoaded', async () => { await fetchProducts(); renderFilters(); renderGrid(); document.getElementById('cart-btn')?.addEventListener('click', toggleCart); });

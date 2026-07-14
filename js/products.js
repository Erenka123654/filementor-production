/* ═══════════════════════════════════════════
   products.js — Ürün Veri Yönetimi
   Sunucu (data/products.json) üzerinden kalıcı saklama
   image: base64 string veya null
   ═══════════════════════════════════════════ */

// Backend başka bir domain'deyse (örn. frontend GitHub Pages'te,
// backend Render'da ise) burayı backend adresinle doldur:
// const API_BASE = "https://filementor.onrender.com";
const API_BASE = window.FILEMENTOR_API_BASE || "";

const EMOJIS = ['🏺','🪴','💡','⚙️','🎮','🔧','🐾','🌸','🦕','🚀','♟️','🎭','🔑','🌙','🎲','🏠','🎨','🌿','🍃','🦋','🏆','🎪','🔮','🌺'];

let productsCache = [];

/* Sunucudan ürünleri çeker ve cache'i günceller.
   Sayfa yüklenirken bir kez, admin panelde her ekle/güncelle/sil sonrası çağrılır. */
async function fetchProducts() {
  try {
    const adminPage = /(?:^|\/)admin\.html$/.test(window.location.pathname);
    const res = await fetch(`${API_BASE}${adminPage ? '/api/admin/products' : '/api/products'}`, {
      credentials: adminPage ? 'include' : 'omit'
    });
    if (!res.ok) throw new Error('Sunucu hatası: ' + res.status);
    const data = await res.json();
    productsCache = Array.isArray(data) ? data : (data.products || []);
  } catch (err) {
    console.error('Ürünler sunucudan yüklenemedi:', err);
    productsCache = [];
  }
  return productsCache;
}

/* Senkron erişim — fetchProducts() ile doldurulmuş cache'i döndürür.
   İlk render'dan önce mutlaka `await fetchProducts()` çağrılmış olmalı. */
function getProducts() {
  return productsCache;
}

/* Yeni ürün ekler (admin.js tarafından çağrılır) */
async function createProduct(payload) {
  const res = await fetch(`${API_BASE}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return res.ok ? data : { success: false, message: data.message || data.error || 'Ürün kaydedilemedi.' };
}

/* Var olan ürünü günceller */
async function updateProductOnServer(id, payload) {
  const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return res.ok ? data : { success: false, message: data.message || data.error || 'Ürün güncellenemedi.' };
}

/* Ürün siler */
async function deleteProductOnServer(id) {
  const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  return res.ok ? data : { success: false, message: data.message || data.error || 'Ürün silinemedi.' };
}

/* 50 MB'a kadar kaynak görseli D1 için güvenli boyuta küçültür ve sıkıştırır. */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Görsel açılamadı.')); };
    img.onload = () => {
      try {
        let maxDimension = 1200;
        let quality = 0.86;
        let encoded = '';
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext('2d', { alpha: false });
          if (!context) throw new Error('Görsel işleyici kullanılamıyor.');
          context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
          context.drawImage(img, 0, 0, width, height);
          encoded = canvas.toDataURL('image/jpeg', quality);
          if (encoded.length <= 680000) { resolve(encoded); return; }
          quality = Math.max(0.5, quality - 0.08);
          maxDimension = Math.max(600, Math.round(maxDimension * 0.82));
        }
        reject(new Error('Görsel güvenli boyuta indirilemedi.'));
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(objectUrl); }
    };
    img.src = objectUrl;
  });
}

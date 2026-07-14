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

/* Resmi base64'e çeviren yardımcı — max 800px, JPEG kalitesi 0.82 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const MAX = 800;
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else        { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Örnek Başlangıç Verileri (LocalStorage entegreli)
let products = JSON.parse(localStorage.getItem('fm_products')) || [
  { id: 1, name: "NFC Tag Keychains", category: "Elektronik", price: 350, stock: 1, status: "Satışta", image: "https://via.placeholder.com/44" },
  { id: 2, name: "Round Flower Pot with Slatted Design", category: "Çiçek", price: 450, stock: 1, status: "Satışta", image: "https://via.placeholder.com/44" },
  { id: 3, name: "Micro SD Box Case", category: "Elektronik", price: 300, stock: 1, status: "Satışta", image: "https://via.placeholder.com/44" },
  { id: 4, name: "PS5 Controller - Headphone Stand", category: "Elektronik", price: 450, stock: 1, status: "Satışta", image: "https://via.placeholder.com/44" },
  { id: 5, name: "Portable Cable Organizer / Winder", category: "Aparat", price: 200, stock: 1, status: "Satışta", image: "https://via.placeholder.com/44" }
];

function saveProducts() {
  localStorage.setItem('fm_products', JSON.stringify(products));
}

// Tabloyu Ekrana Basma
function renderProducts(items = products) {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;

  tbody.innerHTML = items.map(p => `
    <tr data-id="${p.id}">
      <td>
        <div class="product-info-cell">
          <img src="${p.image}" alt="${p.name}" class="product-thumb">
          <span>${p.name}</span>
        </div>
      </td>
      <td>${p.category}</td>
      <td>₺${p.price}</td>
      <td>
        <div class="stock-control">
          <button type="button" class="btn-qty" onclick="changeStock(${p.id}, -1)">-</button>
          <span class="stock-val">${p.stock}</span>
          <button type="button" class="btn-qty" onclick="changeStock(${p.id}, 1)">+</button>
        </div>
      </td>
      <td>
        <span class="badge-status">${p.status || 'Satışta'}</span>
      </td>
      <td>
        <div class="action-btn-group">
          <button type="button" class="btn-action" onclick="openEditProductModal(${p.id})">
            <i class="fa-solid fa-pen"></i> Düzenle
          </button>
          <button type="button" class="btn-action" onclick="deleteProduct(${p.id})">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Modal Aç / Kapat
function openAddProductModal() {
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('modalTitle').innerText = 'Yeni Ürün Ekle';
  document.getElementById('productModal').style.display = 'flex';
}

function openEditProductModal(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('editProductId').value = prod.id;
  document.getElementById('pName').value = prod.name;
  document.getElementById('pCategory').value = prod.category;
  document.getElementById('pPrice').value = prod.price;
  document.getElementById('pStock').value = prod.stock;
  document.getElementById('pImage').value = prod.image;

  document.getElementById('modalTitle').innerText = 'Ürünü Düzenle';
  document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

// Form Kaydetme
function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('pName').value;
  const category = document.getElementById('pCategory').value;
  const price = parseFloat(document.getElementById('pPrice').value);
  const stock = parseInt(document.getElementById('pStock').value, 10);
  const image = document.getElementById('pImage').value || 'https://via.placeholder.com/44';

  if (id) {
    // Güncelleme
    const index = products.findIndex(p => p.id === parseInt(id, 10));
    if (index !== -1) {
      products[index] = { ...products[index], name, category, price, stock, image };
    }
  } else {
    // Yeni Ekleme
    const newProduct = {
      id: Date.now(),
      name,
      category,
      price,
      stock,
      status: "Satışta",
      image
    };
    products.unshift(newProduct);
  }

  saveProducts();
  renderProducts();
  closeProductModal();
}

// Stok Artır/Azalt
function changeStock(id, delta) {
  const prod = products.find(p => p.id === id);
  if (prod) {
    prod.stock = Math.max(0, prod.stock + delta);
    saveProducts();
    renderProducts();
  }
}

// Ürün Sil
function deleteProduct(id) {
  if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    renderProducts();
  }
}

// Arama Filtresi
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.category.toLowerCase().includes(query)
  );
  renderProducts(filtered);
});

// Modal dışına tıklayınca kapatma
window.addEventListener('click', (e) => {
  const modal = document.getElementById('productModal');
  if (e.target === modal) {
    closeProductModal();
  }
});

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
});

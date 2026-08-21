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

function renderProducts(items = products) {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;

  if (typeof tbody.replaceChildren === 'function') {
    tbody.replaceChildren();
  } else {
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
  }

  items.forEach(p => {
    const tr = document.createElement('tr');
    tr.dataset.id = String(p.id);

    // Ürün Bilgisi (Görsel ve Başlık)
    const tdProduct = document.createElement('td');
    const infoDiv = document.createElement('div');
    infoDiv.className = 'product-info-cell';
    
    const img = document.createElement('img');
    img.src = p.image || 'https://via.placeholder.com/44';
    img.alt = p.name;
    img.className = 'product-thumb';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = p.name;

    infoDiv.appendChild(img);
    infoDiv.appendChild(titleSpan);
    tdProduct.appendChild(infoDiv);

    // Kategori
    const tdCat = document.createElement('td');
    tdCat.textContent = p.category;

    // Fiyat
    const tdPrice = document.createElement('td');
    tdPrice.textContent = '₺' + p.price;

    // Stok Kontrolü (+ / -)
    const tdStock = document.createElement('td');
    const stockDiv = document.createElement('div');
    stockDiv.className = 'stock-control';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'btn-qty';
    btnMinus.textContent = '-';
    btnMinus.addEventListener('click', () => changeStock(p.id, -1));

    const stockVal = document.createElement('span');
    stockVal.className = 'stock-val';
    stockVal.textContent = String(p.stock);

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'btn-qty';
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => changeStock(p.id, 1));

    stockDiv.appendChild(btnMinus);
    stockDiv.appendChild(stockVal);
    stockDiv.appendChild(btnPlus);
    tdStock.appendChild(stockDiv);

    // Durum Rozeti
    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge-status';
    badge.textContent = p.status || 'Satışta';
    tdStatus.appendChild(badge);

    // Aksiyon Butonları (Düzenle / Sil)
    const tdAction = document.createElement('td');
    const btnGroup = document.createElement('div');
    btnGroup.className = 'action-btn-group';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-action';
    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    const editText = document.createTextNode(' Düzenle');
    btnEdit.appendChild(editIcon);
    btnEdit.appendChild(editText);
    btnEdit.addEventListener('click', () => openEditProductModal(p.id));

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn-action';
    const delIcon = document.createElement('i');
    delIcon.className = 'fa-solid fa-trash';
    const delText = document.createTextNode(' Sil');
    btnDelete.appendChild(delIcon);
    btnDelete.appendChild(delText);
    btnDelete.addEventListener('click', () => deleteProduct(p.id));

    btnGroup.appendChild(btnEdit);
    btnGroup.appendChild(btnDelete);
    tdAction.appendChild(btnGroup);

    // Satıra hücreleri ekle
    tr.appendChild(tdProduct);
    tr.appendChild(tdCat);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

function openAddProductModal() {
  const form = document.getElementById('productForm');
  if (form) form.reset();
  const idInput = document.getElementById('editProductId');
  if (idInput) idInput.value = '';
  const title = document.getElementById('modalTitle');
  if (title) title.textContent = 'Yeni Ürün Ekle';
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.add('active');
}

function openEditProductModal(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  const idInput = document.getElementById('editProductId');
  const nameInput = document.getElementById('pName');
  const catInput = document.getElementById('pCategory');
  const priceInput = document.getElementById('pPrice');
  const stockInput = document.getElementById('pStock');
  const imgInput = document.getElementById('pImage');
  const title = document.getElementById('modalTitle');

  if (idInput) idInput.value = String(prod.id);
  if (nameInput) nameInput.value = prod.name;
  if (catInput) catInput.value = prod.category;
  if (priceInput) priceInput.value = String(prod.price);
  if (stockInput) stockInput.value = String(prod.stock);
  if (imgInput) imgInput.value = prod.image;
  if (title) title.textContent = 'Ürünü Düzenle';

  const modal = document.getElementById('productModal');
  if (modal) modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('active');
}

function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId')?.value;
  const name = document.getElementById('pName')?.value.trim() || '';
  const category = document.getElementById('pCategory')?.value.trim() || '';
  const price = parseFloat(document.getElementById('pPrice')?.value) || 0;
  const stock = parseInt(document.getElementById('pStock')?.value, 10) || 0;
  const image = document.getElementById('pImage')?.value.trim() || 'https://via.placeholder.com/44';

  if (id) {
    const index = products.findIndex(p => p.id === parseInt(id, 10));
    if (index !== -1) {
      products[index] = { ...products[index], name, category, price, stock, image };
    }
  } else {
    products.unshift({
      id: Date.now(),
      name,
      category,
      price,
      stock,
      status: "Satışta",
      image
    });
  }

  saveProducts();
  renderProducts();
  closeProductModal();
}

function changeStock(id, delta) {
  const prod = products.find(p => p.id === id);
  if (prod) {
    prod.stock = Math.max(0, prod.stock + delta);
    saveProducts();
    renderProducts();
  }
}

function deleteProduct(id) {
  if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    renderProducts();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();

  document.getElementById('btnOpenAddModal')?.addEventListener('click', openAddProductModal);
  document.getElementById('btnCloseModal')?.addEventListener('click', closeProductModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeProductModal);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
  });

  window.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (e.target === modal) {
      closeProductModal();
    }
  });
});

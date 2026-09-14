'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
class Element {
  constructor() {
    this.value = '';
    this.children = [];
    this.listeners = {};
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  removeAttribute() {}
  focus() {}
  addEventListener(name, handler) { this.listeners[name] = handler; }
}

async function main() {
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const documentListeners = {};
  const requests = [];
  let failProducts = false;
  let products = [{ id: 'one', name: 'Test ürün', cat: 'Dekor', price: 25, stock: 3, status: 'active', isNew: 1 }];
  const context = vm.createContext({
    console: { error() {} },
    Intl, URL,
    document: {
      getElementById: id => elements.get(id),
      createElement: () => new Element(),
      querySelectorAll: () => [],
      addEventListener: (name, handler) => { documentListeners[name] = handler; }
    },
    window: {
      location: { hostname: 'filementorstudio.net', pathname: '/admin.html', replace() {} },
      addEventListener() {}, confirm: () => true, clearTimeout() {}, setTimeout() {}
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      let data = {};
      let ok = true;
      if (url.endsWith('/me')) data = { username: 'admin' };
      else if (url.endsWith('/orders')) data = { orders: [] };
      else if (options.method === 'POST') {
        products.push({ id: 'two', ...JSON.parse(options.body) });
        data = { success: true };
      } else if (options.method === 'PUT') {
        products[0] = { id: 'one', ...JSON.parse(options.body) };
        data = { success: true };
      } else if (options.method === 'DELETE') {
        products = products.filter(product => !url.endsWith('/' + product.id));
        data = { success: true };
      } else { data = { products }; ok = !failProducts; }
      return { ok, status: ok ? 200 : 503, json: async () => JSON.parse(JSON.stringify(data)) };
    }
  });
  // Separate classic scripts share one global lexical environment in browsers.
  for (const match of html.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
  }
  await documentListeners.DOMContentLoaded();
  const el = id => elements.get(id);
  assert.equal(el('productTableBody').children.length, 1);
  assert.equal(el('adminWhoami').textContent, 'admin');
  const actions = () => el('productTableBody').children[0].children[5].children[0].children;
  actions()[0].listeners.click();
  assert.ok(el('productModal').classes.has('open'));
  el('pName').value = 'Güncel ürün';
  await el('productForm').listeners.submit({ preventDefault() {} });
  assert.equal(products[0].name, 'Güncel ürün');
  assert.equal(products[0].isNew, true);
  el('btnOpenAddModal').listeners.click();
  el('pName').value = 'Yeni ürün';
  el('pCategory').value = 'Hobi';
  el('pPrice').value = '40';
  await el('productForm').listeners.submit({ preventDefault() {} });
  assert.equal(el('productTableBody').children.length, 2);
  await actions()[1].listeners.click();
  assert.equal(el('productTableBody').children.length, 1);
  failProducts = true;
  await el('btnRefresh').listeners.click();
  assert.match(el('loadError').textContent, /Ürünler yüklenemedi/);
  assert.equal(el('productTableBody').children.length, 1);
  failProducts = false;
  await el('btnRefresh').listeners.click();
  assert.equal(el('loadError').textContent, '');
  const reads = requests.filter(request => request.url.endsWith('/products') && !request.options.method);
  assert.ok(reads.every(request => request.url.endsWith('/api/admin/products') && request.options.credentials === 'include'));
  const encoded = 'data:image/jpeg;base64,/9j/';
  context.FileReader = class {
    readAsDataURL(file) {
      if (file.unreadable) { this.onerror(); return; }
      this.result = encoded;
      this.onload();
    }
  };
  context.Image = class {
    width = 1600;
    height = 1200;
    set src(value) {
      assert.ok(value.startsWith('data:image/'), 'Image decoding must comply with the data: CSP');
      this.onload();
    }
  };
  const originalCreate = context.document.createElement;
  context.document.createElement = tag => tag === 'canvas' ? {
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toDataURL: () => encoded
  } : originalCreate(tag);
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    context.testFile = { type, size: 1024 };
    assert.equal(await vm.runInContext('fileToBase64(testFile)', context), encoded);
  }
  for (const file of [{ type: 'image/heic', size: 10 }, { type: 'image/png', size: 51 * 1024 * 1024 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 10, unreadable: true }]) {
    context.testFile = file;
    await assert.rejects(vm.runInContext('fileToBase64(testFile)', context));
  }
  await el('pImageFile').listeners.change({ target: { files: [{ type: 'image/png', size: 1024 }] } });
  assert.equal(el('pImageData').value, encoded);
  await el('pImageFile').listeners.change({ target: { files: [{ type: 'image/heic', size: 1024 }] } });
  assert.equal(el('pImageData').value, encoded, 'Failed replacements must preserve the previous image');
  assert.match(el('imageUploadStatus').textContent, /JPEG, PNG veya WebP/);
  assert.equal(el('btnSubmitProduct').disabled, false);
  console.log('Image checks passed: CSP-compatible decoding, format/size validation and failed replacement preservation.');
  console.log('Admin regression checks passed: startup, edit, create, delete, refresh and error recovery.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

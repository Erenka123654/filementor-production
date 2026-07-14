'use strict';

function checkoutValue(id) { return document.getElementById(id)?.value.trim() || ''; }
function checkoutMoney(value) { return `₺${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function openCheckout() {
  if (!cart.length) { showToast('Sepetiniz boş!'); return; }
  goStep(1);
  document.getElementById('pay-overlay')?.classList.add('open');
  document.getElementById('pay-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('pay-overlay')?.classList.remove('open');
  document.getElementById('pay-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function validCheckoutDetails() {
  const required = ['pay-name', 'pay-surname', 'pay-email', 'pay-phone', 'pay-identity', 'pay-address', 'pay-district', 'pay-city', 'pay-zip'];
  if (required.some(id => !checkoutValue(id))) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutValue('pay-email'))) return false;
  if (!/^\d{11}$/.test(checkoutValue('pay-identity'))) return false;
  return /^\d{5}$/.test(checkoutValue('pay-zip'));
}

function renderOrderSummary() {
  const summary = document.getElementById('order-summary');
  if (summary) {
    summary.replaceChildren(...cart.map(item => {
      const row = document.createElement('div'); row.className = 'cart-total-row';
      const name = document.createElement('span'); name.textContent = `${item.name} × ${item.qty}`;
      const price = document.createElement('strong'); price.textContent = checkoutMoney(Number(item.price) * item.qty);
      row.append(name, price); return row;
    }));
  }
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const totalElement = document.getElementById('order-total-final');
  if (totalElement) totalElement.textContent = checkoutMoney(total);
}

function goStep(step) {
  if (step > 1 && !validCheckoutDetails()) {
    showToast('Lütfen teslimat bilgilerini eksiksiz ve geçerli girin.');
    return;
  }
  if (step === 3) renderOrderSummary();
  ['step-1', 'step-2', 'step-3', 'step-success'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = id === `step-${step}` ? '' : 'none';
  });
}

async function processPayment() {
  if (!validCheckoutDetails() || !cart.length) return goStep(1);
  const button = document.getElementById('pay-btn');
  if (button) { button.disabled = true; button.textContent = 'Ödeme sayfası hazırlanıyor...'; }
  try {
    const response = await fetch(`${window.FILEMENTOR_API_BASE || ''}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        name: checkoutValue('pay-name'), surname: checkoutValue('pay-surname'),
        email: checkoutValue('pay-email'), phone: checkoutValue('pay-phone'),
        identityNumber: checkoutValue('pay-identity'), address: checkoutValue('pay-address'),
        district: checkoutValue('pay-district'), city: checkoutValue('pay-city'), zipCode: checkoutValue('pay-zip'),
        items: cart.map(item => ({ id: String(item.id), quantity: item.qty })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.paymentPageUrl) throw new Error(data.error || 'Ödeme başlatılamadı.');
    window.location.assign(data.paymentPageUrl);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Ödeme başlatılamadı.');
    if (button) { button.disabled = false; button.textContent = '🔒 Güvenli Ödemeyi Tamamla'; }
  }
}

function selectInstallment() { /* iyzico Checkout Form controls installments. */ }

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  if (payment === 'success') { cart = []; updateCartUI(); showToast('Ödemeniz başarıyla alındı. Teşekkür ederiz!'); }
  if (payment === 'failed') showToast('Ödeme tamamlanamadı. Lütfen tekrar deneyin.');
  if (payment) window.history.replaceState({}, '', window.location.pathname + window.location.hash);
});

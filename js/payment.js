'use strict';

function openCheckout() {
  if (!cart.length) { showToast('Sepetiniz boş!'); return; }
  const hostedPaymentUrl = String(window.FILEMENTOR_PAYMENT_URL || '');
  if (!hostedPaymentUrl.startsWith('https://')) {
    showToast('Online ödeme henüz etkin değil. Lütfen iletişim formunu kullanın.');
    return;
  }
  window.location.assign(hostedPaymentUrl);
}

function closeCheckout() {
  document.getElementById('pay-overlay')?.classList.remove('open');
  document.getElementById('pay-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function goStep() { openCheckout(); }
function selectInstallment() { /* Hosted payment provider controls installments. */ }
function processPayment() { openCheckout(); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#pay-modal input').forEach(input => {
    input.disabled = true;
    input.autocomplete = 'off';
  });
});

'use strict';
(() => {
  const whatsapp = document.createElement('a');
  whatsapp.href = 'https://wa.me/905013242362?text=' + encodeURIComponent('Merhaba, Filementor ürünleri ve özel 3D baskı hakkında bilgi almak istiyorum.');
  whatsapp.className = 'whatsapp-contact'; whatsapp.textContent = 'WhatsApp ile sor';
  whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
  document.body.append(whatsapp);
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const result = document.getElementById('quote-result');
    const file = form.elements.namedItem('file').files[0];
    if (file && file.size > 5 * 1024 * 1024) { result.textContent = 'Dosya en fazla 5 MB olabilir.'; return; }
    button.disabled = true; result.textContent = 'Talep gönderiliyor…';
    try {
      const response = await fetch(`${window.FILEMENTOR_API_BASE || ''}/api/quotes`, { method:'POST', body: new FormData(form), credentials:'omit' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Talep gönderilemedi.');
      form.reset(); result.textContent = `${data.message} Talep numarası: ${data.reference}`;
    } catch (error) { result.textContent = error.message || 'Bağlantı kurulamadı. WhatsApp üzerinden ulaşabilirsiniz.'; }
    finally { button.disabled = false; }
  });
  // Keep provider-required identity collection unless server configuration confirms approval.
  window.FILEMENTOR_IDENTITY_REQUIRED = true;
  fetch(`${window.FILEMENTOR_API_BASE || ''}/api/store-settings`, { cache:'no-store' }).then(r => r.ok ? r.json() : {}).then(settings => {
    if (settings.identityRequired === false) {
      window.FILEMENTOR_IDENTITY_REQUIRED = false;
      const input = document.getElementById('pay-identity');
      if (input) { input.value = ''; input.closest('.form-group').hidden = true; }
    }
  }).catch(() => {});
})();

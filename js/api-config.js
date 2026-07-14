'use strict';

window.FILEMENTOR_API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8787'
  : 'https://api.filementorstudio.net';
// Use an iyzico hosted payment-page URL only. Raw card data must never be sent
// through this static frontend or the product API Worker.
window.FILEMENTOR_PAYMENT_URL = '';
// Optional public contact mailbox. Leave blank until a monitored mailbox exists.
window.FILEMENTOR_CONTACT_EMAIL = '';

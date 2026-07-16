'use strict';

window.FILEMENTOR_API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8787'
  : 'https://api.filementorstudio.net';
// Optional public contact mailbox. Leave blank until a monitored mailbox exists.
window.FILEMENTOR_CONTACT_EMAIL = 'erenkaraca2005@gmail.com';

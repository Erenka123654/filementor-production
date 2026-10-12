'use strict';

window.FILEMENTOR_API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8787'
  : 'https://api.filementorstudio.net';

// WhatsApp numarası ülke koduyla, başında + veya 0 olmadan yazılmalıdır.
window.FILEMENTOR_WHATSAPP_NUMBER = '905013242362';

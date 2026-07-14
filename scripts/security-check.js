'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceFiles = [
  'index.html', 'login.html', 'admin.html',
  'js/api-config.js', 'js/products.js', 'js/store.js',
  'js/admin.js', 'js/admin-guard.js', 'js/payment.js', 'src/worker.js',
];
const forbidden = [
  { pattern: /\.innerHTML\s*=/, message: 'innerHTML assignment' },
  { pattern: /\beval\s*\(/, message: 'eval call' },
  { pattern: /document\.write\s*\(/, message: 'document.write call' },
];
const failures = [];

for (const relative of sourceFiles) {
  const contents = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(contents)) failures.push(`${relative}: ${rule.message}`);
  }
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/id="card-(?:num|holder|exp|cvv)"/.test(index)) {
  failures.push('index.html: raw payment-card fields must not be collected');
}

const worker = fs.readFileSync(path.join(root, 'src/worker.js'), 'utf8');
if (/Access-Control-Allow-Origin[\s\S]{0,80}["']\*["']/.test(worker)) {
  failures.push('src/worker.js: wildcard production CORS');
}

if (failures.length) {
  console.error(`Security check failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Security checks passed.');
}

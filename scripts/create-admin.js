#!/usr/bin/env node
'use strict';

// İlk yönetici (owner) hesabını oluşturmak için kullanılır.
// admin_users tablosu boşken sisteme giriş yapabilecek hiç kimse olmaz —
// bu script şifreyi worker.js ile aynı yöntemle (PBKDF2-SHA256) hash'ler
// ve çalıştırman gereken `wrangler d1 execute` komutunu ekrana basar.
//
// Kullanım:
//   node scripts/create-admin.js <kullanici_adi> <sifre> [owner|staff]
//
// Örnek:
//   node scripts/create-admin.js eren "cok-uzun-ve-benzersiz-bir-sifre" owner

const { webcrypto: crypto } = require('node:crypto');

const [, , usernameArg, password, roleArg] = process.argv;
const role = roleArg === 'staff' ? 'staff' : 'owner';

if (!usernameArg || !password) {
  console.error('Kullanım: node scripts/create-admin.js <kullanici_adi> <sifre> [owner|staff]');
  process.exit(1);
}

const username = usernameArg.trim().toLowerCase();

if (!/^[a-z0-9_]{3,32}$/.test(username)) {
  console.error('Kullanıcı adı 3-32 karakter olmalı; sadece küçük harf, rakam ve alt çizgi içerebilir.');
  process.exit(1);
}

if (password.length < 10) {
  console.error('Şifre en az 10 karakter olmalıdır.');
  process.exit(1);
}

function bytesOf(value) {
  return new TextEncoder().encode(value);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', bytesOf(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  const hashHex = toHex(derived);
  const saltHex = toHex(salt);
  const createdAt = Date.now();

  const sql = `INSERT INTO admin_users (username, password_hash, password_salt, role, status, created_at) VALUES ('${username}', '${hashHex}', '${saltHex}', '${role}', 'approved', ${createdAt});`;

  console.log('\nAşağıdaki komutu çalıştırarak hesabı oluşturun:\n');
  console.log(`wrangler d1 execute filementor-db --remote --command="${sql}"`);
  console.log('\nYerelde test etmek için --remote yerine --local kullanın.\n');
}

main();

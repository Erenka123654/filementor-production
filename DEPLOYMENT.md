# Production deployment

## 1. Sızmış anahtarları iptal edin

Önceki `config.json` dosyasında bulunan tüm iyzico anahtarlarını iyzico panelinden iptal edin ve yenilerini oluşturun. Yeni değerleri bu repoya, GitHub Actions değişkenlerine veya `wrangler.jsonc` içine düz metin olarak yazmayın.

## 2. Cloudflare oturumunu açın

```powershell
npx wrangler login
npx wrangler whoami
```

## 3. D1 veritabanını doğrulayın

`wrangler.jsonc` içindeki `database_id` doğru hesaptaki `filementor-db` veritabanına ait olmalıdır. Yeni hesapta gerekiyorsa:

```powershell
npx wrangler d1 create filementor-db
```

Dönen kimliği `wrangler.jsonc` içine yazın ve migration'ı uygulayın:

```powershell
npm run db:remote
```

Mevcut veritabanında önce yedek alın:

```powershell
npx wrangler d1 export filementor-db --remote --output backup.sql
```

`backup.sql` secret veya müşteri verisi içerebileceğinden commit edilmemelidir.

## 4. Worker secret'larını tanımlayın

Değerleri komut satırı argümanı olarak vermeyin; aşağıdaki komutlar güvenli interaktif giriş ister:

```powershell
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` en az 32 rastgele karakter olmalıdır. Admin parolası benzersiz ve uzun olmalıdır.

## 5. Deploy öncesi doğrulama

```powershell
npm ci
npm run check
npm audit --omit=dev
npm run build
npm run types
npm run deploy:dry
```

Bir komut başarısızsa deploy etmeyin.

## 6. API Worker'ını yayınlayın

```powershell
npm run deploy
```

`api.filementorstudio.net` custom domaininin doğru Cloudflare zone içinde bulunduğunu ve TLS sertifikasının aktif olduğunu doğrulayın.

## 7. Frontend'i yayınlayın

Cloudflare Pages'te bu GitHub reposunu bağlayın:

- Framework preset: `None`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`
- Production branch: `main`

Pages projesine `filementorstudio.net` ve `www.filementorstudio.net` custom domainlerini ekleyin. `js/api-config.js` production ortamında otomatik olarak `https://api.filementorstudio.net` kullanır.

Yayınlamadan önce `FILEMENTOR_PAYMENT_URL` değerini yalnızca sağlayıcının HTTPS hosted-checkout adresine, `FILEMENTOR_CONTACT_EMAIL` değerini ise izlenen genel iletişim adresine ayarlayın. `dist` çıktısı backend kaynaklarını, yerel secret dosyalarını ve geliştirme bağımlılıklarını yayınlamaz.

## 8. Production smoke test

```powershell
Invoke-RestMethod https://api.filementorstudio.net/api/health
Invoke-RestMethod https://api.filementorstudio.net/api/products
```

Ardından gizli tarayıcı penceresinde:

1. Mağaza ve CSS/görsellerin yüklendiğini kontrol edin.
2. `admin.html` sayfasının login'e yönlendirdiğini kontrol edin.
3. Admin girişi yapıp ürün ekleme, düzenleme ve silmeyi deneyin.
4. Taslak ürünün mağazada görünmediğini, admin panelinde göründüğünü doğrulayın.
5. Hatalı login denemelerinde 429 rate-limit yanıtını kontrol edin.

## 9. İzleme ve geri dönüş

```powershell
npx wrangler tail --status error
npx wrangler versions list
npx wrangler rollback
```

Worker logları aktiftir; hata yanıtları istemciye stack trace veya servis detayı döndürmez.

# Filementor

Filementor; ürün kataloğu, sepet ve güvenli yönetim panelinden oluşan statik bir web uygulamasıdır. Production API, Cloudflare Worker üzerinde çalışır ve verileri Cloudflare D1'da tutar.

## Mimari

- Frontend: HTML, CSS ve tarayıcı JavaScript'i
- API: Cloudflare Workers
- Veritabanı: Cloudflare D1 (SQLite)
- Kimlik doğrulama: HMAC imzalı, `HttpOnly`, `SameSite=Strict` admin cookie
- Production domainleri: `filementorstudio.net` ve `api.filementorstudio.net`

Eski Express, Firebase ve dosya tabanlı backend uygulamaları kaldırılmıştır. Tek desteklenen backend `src/worker.js` dosyasıdır.

## Gereksinimler

- Node.js 22 veya 24
- npm
- Cloudflare hesabı (production deploy için)
- Statik frontend için Cloudflare Pages veya eşdeğer HTTPS hosting

## Yerelde çalıştırma

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

`.dev.vars` içindeki örnek değerleri uzun ve benzersiz yerel değerlerle değiştirin. Dosya Git tarafından yok sayılır.

Başka bir terminalde frontend'i `8080` portunda sunun:

```powershell
python -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın. Local frontend otomatik olarak `http://localhost:8787` API'sini kullanır. Yönetim girişi `login.html` sayfasındadır.

## Kontroller

```powershell
npm run check
npm run audit
npm run build
npm run deploy:dry
```

Her production deploy öncesinde ilk iki komut zorunludur. Ayrıntılı canlıya alma adımları için [DEPLOYMENT.md](DEPLOYMENT.md) dosyasına bakın.

## Ödeme

Ödeme, iyzico Checkout Form hosted sayfası üzerinden yapılır; ham kart verisi Filementor frontend'ine, Worker'a veya D1 veritabanına gelmez. Worker sepet tutarını istemciden kabul etmez, aktif ürün fiyatlarını D1'dan yeniden hesaplar. Callback sonrasında iyzico sonucu ve HMAC response signature doğrulanmadan sipariş `paid` durumuna geçmez.

Yerelde sandbox anahtarlarını yalnızca `.dev.vars` içinde `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` ve `IYZICO_ENVIRONMENT=sandbox` olarak tanımlayın. Production anahtarları Cloudflare secret olarak saklanmalıdır.

İletişim formu `POST /api/contact` üzerinden Cloudflare Email Sending binding'ini kullanır. Canlıya almadan önce `filementorstudio.net` alanını Cloudflare Email Sending'e dahil edin ve `wrangler.jsonc` içindeki `EMAIL` binding'inin oluştuğunu doğrulayın. Gönderen ve alıcı adresleri `CONTACT_FROM_EMAIL` ile `CONTACT_TO_EMAIL` değişkenlerinden okunur; e-posta API anahtarı kaynak kodda tutulmaz.

## Güvenlik notu

Önceki sürümde repoya yazılmış iyzico anahtarları artık güvenli kabul edilemez. Bu anahtarlar sağlayıcı panelinden iptal edilip yenilenmelidir; yalnızca dosyayı Git'ten kaldırmak yeterli değildir.

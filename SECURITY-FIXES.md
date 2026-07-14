# Filementor güvenlik düzeltmeleri

## Kritik işlem
Repodaki `config.json` içinde yayınlanmış iyzico API/secret anahtarları artık gizli kabul edilemez. iyzico panelinden derhal iptal edip yenilerini üretin. Git geçmişinden silmek tek başına yeterli değildir.

## Yapılanlar
- Secret/config dosyasından anahtar okuma kaldırıldı; `.env` zorunlu hale getirildi.
- Wildcard CORS kaldırıldı; izinli origin beyaz listesi eklendi.
- Helmet/CSP/HSTS/nosniff/clickjacking koruması eklendi.
- Genel API, giriş ve yazma endpointleri için rate limiting eklendi.
- Zod ile strict sunucu tarafı ürün doğrulaması eklendi.
- JWT süresi 8 saatten 1 saate indirildi; issuer/audience doğrulaması eklendi.
- 5 başarısız girişten sonra 15 dakikalık kilit eklendi.
- Cookie httpOnly/secure/sameSite=strict olarak ayarlandı.
- Admin yazma isteklerinde Origin kontrolü eklendi.
- JSON body 1 MB ile sınırlandı; base64 resim tipi ve boyutu doğrulanıyor.
- Atomik dosya yazımı ve güvenli dosya izinleri eklendi.
- Stack trace ve iç hata mesajlarının istemciye sızması engellendi.
- `X-Powered-By` kapatıldı.

## Ürün kaydetme hatasının sebebi
Repo kökündeki `package.json` `node server.js` çalıştırıyor, fakat sunucu dosyası `js/server.js` altında. Ayrıca o dosya `./auth` ve `data/products.json` yollarını kendi klasörüne göre arıyor. Bu nedenle backend doğru başlamıyor veya yanlış dosyalara bakıyor. Bu pakette güvenli `server.js` köke taşındı.

## Frontend bağlantısı
`api-config.js` dosyasını `products.js` dosyasından önce yükleyin. Worker adresiniz farklıysa dosyadaki URL'yi değiştirin. Node backend kullanacaksanız bu URL'yi Render/Cloudflare backend adresi yapın.

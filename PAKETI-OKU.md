# Filementor satış geliştirme paketi

Hazırlanma: 29 Eylül 2026. Taban: filementor-production, `657a5f27bd453b60f646032c21d220083cd61c31`. Bu ZIP tam proje kaynaklarını ve yayınlanmaya hazırlanmış `dist/` klasörünü içerir. Canlı siteye veya GitHub'a otomatik yükleme yapılmadı.

## Çalışan kod olarak eklenenler

1. WhatsApp düğmesi: **+90 501 324 23 62**. Ürün sayfalarında ürüne özel mesaj.
2. Telefon, adet ve isteğe bağlı STL/PNG/JPEG/WebP dosyalı teklif formu. Dosya sınırı 5 MB; sunucuda boyut, uzantı ve dosya imzası denetimi. Talep D1'de, dosya özel R2 bucket'ında saklanır.
3. `teklifler.html` yönetici ekranı: son 100 talep, yeni/inceleniyor/tamamlandı durumu ve oturumla dosya indirme. Admin menüsüne bağlantı eklendi. Yeni form bildirim e-postası göndermez; talepler bu ekrandan takip edilir.
4. Misafir ödeme bilgisi açıkça gösterilir. Misafir ödeme zaten mevcut backend'de destekleniyordu.
5. iyzico kimlik alanı sunucu ayarıyla yönetilir. Varsayılan olarak korunur; sağlayıcı onayı olmadan kaldırılmaz. Sahte kimlik numarası gönderilmez.
6. Canlı katalogdan alınan 15 ürün için statik HTML sayfaları, canonical, meta açıklama, Product/Offer JSON-LD, sitemap ve robots.txt. Ürün kartlarında detay bağlantısı ve stok bilgisi.
7. Doğrulanamayan “150+ ürün”, “500+ mutlu müşteri” ve kesin “2 gün teslimat” iddiaları kaldırıldı.

## Belge/şablon olarak eklenenler

`buyume/` klasöründe Instagram/TikTok takvimi, Google hizmet sayfası taslağı, B2B teklif metni, fotoğraf/yorum toplama planı, fiyatlandırma çalışma şablonu, ücretsiz kargo/kupon/havale/kapıda ödeme karar listesi ve izinli iletişim mesaj taslakları bulunur.

Şunlar otomatik çalışan özellik olarak sunulmaz: STL'den kesin otomatik fiyat, kapıda ödeme/havale sipariş akışı, kupon hesaplama, ücretsiz kargo kampanyası, terk edilmiş sepet e-postası/WhatsApp otomasyonu, pazar yeri hesapları veya Search Console kaydı. Bunlar maliyet, banka/lojistik koşulları ve iletişim izinleri gerektirir. Eksik değerler uydurulmadı; ilgili hazırlıklar belgelerde belirtildi.

## iyzico ve kimlik alanı

İncelenen resmi Checkout Form şemasında `buyer.identityNumber` zorunludur:
https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu/cf-baslatma

Bu nedenle varsayılan çalışan ödeme akışı korunur. İyzico hesabınız/entegrasyonunuz için numarasız işlemin desteklendiğini yazılı olarak doğruladıktan ve sandbox testi yaptıktan sonra Worker değişkeni `IYZICO_IDENTITY_OPTIONAL_APPROVED="true"` kullanılabilir. Bu ayar alıcının numarasını uydurmaz, alanı sağlayıcı isteğinden çıkarır. Standart mevcut API bunu reddedebilir; onay ve gerekirse sağlayıcı entegrasyon değişikliği olmadan etkinleştirmeyin. Frontend, ayarı `/api/store-settings` üzerinden alır; ayar okunamazsa alan zorunlu kalır.

## Kurulum sırası

Node.js 24 kullanın. Mevcut Worker ve veritabanının yedeğini alın; bu paket migration çalıştırmadı.

```powershell
npm ci
npm run check
npm audit --omit=dev
npx wrangler r2 bucket create filementor-quotes
npm run db:remote
npm run catalog:sync
npm run build
npm run deploy:dry
```

`wrangler.jsonc` içinde `QUOTE_FILES` R2 binding ve `filementor-quotes` bucket adı eşleşmelidir. **R2 public access/r2.dev erişimi açmayın.** 0005 migration yalnızca yeni teklif tablosunu ekler. Önce migration/R2 ve Worker'ı, sonra frontend `dist/` içeriğini yayınlayın. Üretim deploy için mevcut `npm run deploy` komutunu yalnızca yetkili hesapla çalıştırın. GitHub Pages kullanılıyorsa `dist` içeriğinin yayımlandığından emin olun; kaynak index.html'i tek başına kopyalamak yeterli değildir.

Mevcut domain, D1 ve Worker adları repo ayarlarından korunmuştur. Yeni bir ortama kuruyorsanız bunları ve `js/api-config.js` adresini güncelleyin. Mevcut sırlar ZIP içinde yoktur; ortamınızdaki sırları koruyun.

## SEO ve görseller

Katalog anlık görüntüsü `data/catalog-export.json` içindedir. Ürün/fiyat/stok değiştikçe `npm run catalog:sync` + `npm run build` ve frontend yayınını tekrarlayın. SEO sayfasındaki fiyat anlık görüntüdür; ödeme tutarı sunucuda hesaplanır. Yeni ürünler katalog yeniden üretilene kadar `urun.html?id=...` dinamik sayfasına gider; bu yedek sayfa noindex'tir.

`dist/merchant-feed.xml` bir taslak üretir. Mevcut 15 üründe herkese açık HTTPS görsel URL'si bulunmadığı için feed **0 ürün** içerir. Görseller şu anda data/base64 biçiminde. Merchant Center için herkese açık, kararlı HTTPS ürün görselleri ve ürün kimliği/GTIN durumu gereklidir; görselleri uygun barındırmaya taşıyıp feed'i yeniden üretin. `identifier_exists` dahil alanları gerçek ürün durumuna göre kontrol etmeden gönderim yapmayın. Merchant Center'a yükleme yapılmadı.

Search Console'da sitemap ve URL denetimi işletme hesabında yapılmalıdır. Statik HTML hazırlanmış olması Google'ın indeksleme veya sıralama garantisi değildir. JSON-LD yorum/puan üretmez.

## Yayından önce işletme kontrolü

- KVKK/iade/satış sayfaları mevcut repoda şirket adı, adres ve e-posta gibi doldurulmamış alanlar içeriyor. Bunlar bu pakette gerçek bilgi olmadan doldurulmadı. Yeni telefon/dosya işleme amaçları KVKK taslağına eklendi; yayın metnini işletmenizin gerçek süreçleriyle tamamlayın.
- Dosya içerik kontrolü antivirüs değildir. İndirdiğiniz STL/görselleri açmadan önce tarayın. Saklama/silme süresini belirleyin; paket otomatik silme politikası uygulamaz.
- Teklif taleplerini yönetici ekranından takip edin. Otomatik 1 saat dönüş sözü yoktur; operasyon bunu sağlayana kadar eklemeyin.
- Ücretsiz kargo eşiği ve indirim oranı kullanıcı tarafından verilmedi; görünür kampanya veya fiyat değişikliği eklenmedi.
- Kullanıcı dosyaları ve kişisel veri özel R2/D1 kaynaklarında tutulur. İşletme bu servisleri veri işleme/aktarım ve saklama prosedürlerinde değerlendirmelidir.

## Test kapsamı

`npm run check`: mevcut admin açılış/CRUD/görsel testleri, yeni dosya tür/boyut/consent doğrulamaları, başarısız veritabanı işleminde R2 temizliği, admin erişim kontrolü, Origin kontrolü, kimlik alanı ayarı ve SEO HTML kaçış testleri. `npm run build`: 15 statik ürün sayfası.

Gerçek iyzico ödemesi, uzak R2/D1 kurulum, canlı admin oturumu, bildirim e-postası, Search Console ve Merchant Center işlemleri yapılmadı. ZIP bir yayın paketi; canlı sitenin değiştiği anlamına gelmez.

29 Eylül doğrulama sonucu: `npm run check`, `npm run build`, `npm run deploy:dry` ve `npm audit --omit=dev` başarılı. Üretim bağımlılıklarında 0 açık bildirildi. Tüm bağımlılıkları kapsayan `npm audit`, güncel Wrangler 4.143.0 geliştirme zincirinde undici WebSocket decompression kaynaklı 3 orta seviye bulgu (aynı kök sorunun üst bağımlılıklara yansıması) bildirdi; araç bu sürüm için düzeltme olmadığını belirtti. Bu yüzden tüm bağımlılıkların temiz olduğu iddia edilmez. Yayın öncesi geliştirme aracı güncellemelerini kontrol edin. Gerçek tarayıcıda uçtan uca ödeme ve yönetici dosya indirme testi yapılmadı.

# Fiyatlandırma, kampanya ve takip hazırlığı

## STL'den anında fiyat neden varsayılan olarak yok?

STL geometri içerir; tek başına baskı süresi, gerçek sarfiyat, destek, doluluk, yönlendirme ve işçilik vermez. Bu pakette dosya yüklenir ve inceleme için kaydedilir. Otomatik kesin fiyat veya süre uydurulmaz.

Güvenilir bir otomatik fiyat aracı için sürümlenmiş yazıcı/malzeme profiliyle sunucu tarafında izole slicer, işlem/bellek/süre limiti, model geçerlilik kontrolü ve doğrulanmış maliyet tablosu gerekir. Cloudflare Worker içinde sınırsız slicer işlemi çalıştırılmamalı; ayrı iş kuyruğu ve hesaplama servisi tasarlanmalıdır.

Elle fiyat hesaplama çalışma şablonu:

| Girdi | İşletmenin dolduracağı değer |
|---|---|
| Slicer malzeme tüketimi | ... g |
| Malzeme maliyeti | ... TL/g |
| Slicer baskı süresi | ... saat |
| Makine saat maliyeti | ... TL/saat |
| Hazırlık/temizlik/boyama | ... dakika × ... TL/dakika |
| Paketleme ve beklenen fire | ... TL |
| Ödeme komisyonu/kargo/vergi yöntemi | ... |
| Hedef brüt marj | ... |

Maliyet = malzeme + makine + işçilik + paketleme + fire. Vergi, komisyon ve marj hesabını işletmenin muhasebe yöntemiyle uygulayın. Bu tablo fiyat tavsiyesi veya vergi hesabı değildir.

## Etkinleştirilmeden önce karar verilecekler

| Özellik | Gerekli bilgi | Bu pakette durum |
|---|---|---|
| Ücretsiz kargo | Eşik, bölge, ürün istisnası, ücret | Etkin değil; tutar verilmedi |
| İlk sipariş indirimi | Kod, oran/tutar, süre, minimum sepet, kullanım limiti | Etkin değil |
| Havale/EFT | Doğrulanmış IBAN/alıcı, sipariş rezervasyonu ve mutabakat | Etkin değil |
| Kapıda ödeme | Kargo sözleşmesi, tahsilat ücreti, iptal/iade akışı | Etkin değil |
| Terk edilmiş sepet hatırlatma | Uygun iletişim izni, kanal, iptal imkânı ve sipariş durumu kontrolü | Otomasyon yok |
| Bir saatte dönüş | Çalışma saatleri, sorumlu kişi, gerçek kapasite | Söz verilmez |

Bu özellikler yalnızca arayüze metin eklenerek açılmaz. İndirim/kargo tutarı backend'de hesaplanmalı, ödeme sağlayıcısına aynı toplam gönderilmeli ve callback aynı tutarı doğrulamalıdır.

İzinli hatırlatma taslağı (otomatik gönderilmez):
“Merhaba [ad], ilgilendiğin ürün hakkında bir sorunun varsa yardımcı olabiliriz: [ürün bağlantısı]. Bu tür mesajları almak istemiyorsan [iptal yöntemi].”

Kimlik/telefon/e-posta yalnızca sepeti terk ettiği için otomatik pazarlama listesine eklenmemelidir. İzin ve iletişim sürecini işletme belirlemelidir.

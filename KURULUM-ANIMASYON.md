# Filementor — Animasyon Katmanı

Mevcut kodunuza dokunmaz; sadece 2 yeni dosya ekler ve index.html'e 2 satır ilave eder.

## Kurulum (en kolay yol)
1. Zip'i açın.
2. `css/animations.css` ve `js/animations.js` dosyalarını repodaki `css/` ve `js/` klasörlerine kopyalayın.
3. Repodaki `index.html` yerine zip içindeki `index.html` dosyasını koyun (tek fark: 2 satır eklendi).
4. Commit + push yapın; Cloudflare Pages otomatik yayınlar.

## index.html'e elle eklemek isterseniz
`<head>` içinde `style.css` satırından sonra:
    <link rel="stylesheet" href="css/animations.css?v=1" />
`</body>` öncesinde, `filementor-ai.js` satırından sonra:
    <script src="js/animations.js?v=1"></script>

## Neler eklendi
- Hero: kelime kelime giriş, turuncu/mavi süzülen ışık küreleri, imleci takip eden ışık, yazıcı katman çizgisi, baskı görselinde 3D eğilme
- Rakam sayacı (150+, 500+, 2 GÜN) yukarı sayar
- Üst bar: scroll'a göre "baskı ilerleme" çubuğu; navbar aşağı kaydırınca gizlenir, yukarı kaydırınca geri gelir
- Ürün kartları: alttan yukarı katman katman "basılarak" belirir, hover'da 3D eğilme + parlama + alt filaman çizgisi
- Bölümler (Hakkımızda, İletişim, Footer) scroll ile belirir; başlık altına turuncu çizgi çizilir
- Butonlarda dalga efekti, ana butonlarda manyetik çekim ve parlama; sepet rozeti zıplar
- AI sohbet butonu hafifçe süzülür

## Kapatmak / ayarlamak
- Tamamen kapatmak için `index.html`'den iki satırı silmeniz yeterli.
- Kullanıcı cihazında "hareketi azalt" açıksa animasyonlar otomatik devre dışı kalır.
- Hız/renk ayarları `css/animations.css` içinde (`--fm-ease`, `.fm-orb-*`, `fm-scan` süresi vb.).
- CSP uyumludur (inline script/style yok); `_headers` dosyasını değiştirmeniz gerekmez.

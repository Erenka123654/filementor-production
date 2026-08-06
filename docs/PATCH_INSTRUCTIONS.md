# Filementor Studio — RAG Chatbot Kurulumu (Adım Adım)

Bu paket, `Erenka123654/filementor-production` reposuna RAG (Retrieval-Augmented
Generation) tabanlı bir müşteri sohbet botu ekler. Cloudflare Workers AI
(embedding + LLM) ve Cloudflare Vectorize kullanır — ek bir API anahtarına
gerek yoktur, hepsi mevcut Cloudflare hesabınla çalışır.

---

## 0) Yeni bir branch aç

```bash
git checkout -b feature/rag-chatbot
```

---

## 1) Vectorize index'i oluştur (bir kere, terminalden)

```bash
npx wrangler vectorize create filementor-knowledge --dimensions=1024 --metric=cosine
```

`bge-m3` embedding modeli 1024 boyutlu vektör ürettiği için `--dimensions=1024` şart.

---

## 2) `wrangler.jsonc`'ye binding ekle

`d1_databases` bloğundan hemen sonra şunu ekle:

```jsonc
  "ai": {
    "binding": "AI"
  },

  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "filementor-knowledge"
    }
  ],
```

---

## 3) Migration dosyasını kopyala

Bu paketteki `migrations/0004_chat_knowledge.sql` dosyasını repo'daki
`migrations/` klasörüne kopyala, sonra uygula:

```bash
npm run db:local    # yerel test için
npm run db:remote    # production'a uygulamaya hazır olduğunda
```

`knowledge_chunks` tablosundaki örnek satırları (kargo, iade, filament türleri)
kendi gerçek metinlerinle güncellemeyi unutma — bunlar admin panelinden veya
doğrudan D1 üzerinden düzenlenebilir.

---

## 4) `src/worker.js`'e helper fonksiyonları ekle

`enforceRateLimit` fonksiyonunun bittiği yeri bul (bu satırı ara):

```js
  return Number(result?.count || 0) <= limit;
}
```

Bu satırın hemen altına, `worker-chat-additions.js` dosyasındaki
**"1) HELPER FONKSİYONLAR"** bölümünün tamamını (yorum satırları hariç,
`const EMBEDDING_MODEL` satırından `validChatMessage` fonksiyonunun sonuna
kadar) yapıştır.

---

## 5) Rate-limit kuralına `/api/chat` ekle

Aynı `enforceRateLimit` fonksiyonu içinde şu satırları bul:

```js
  const windowSeconds = login || contact ? 900 : 60;
  const limit = login ? 5 : contact ? 5 : 60;
```

Şununla değiştir (chat için dakikada 15 istekle sınırlıyoruz — LLM çağrıları
maliyetli olduğu için):

```js
  const chat = path === "/api/chat";
  const windowSeconds = login || contact ? 900 : 60;
  const limit = login ? 5 : contact ? 5 : chat ? 15 : 60;
```

---

## 6) Yeni route'ları ekle

`worker.js` içinde şu bloğu bul:

```js
      return jsonResponse(
        request,
        { error: "Endpoint bulunamadı." },
        404
      );
    } catch (error) {
```

Bunun **hemen üstüne**, `worker-chat-additions.js` dosyasındaki
**"2) YENİ ROUTE'LAR"** bölümündeki `/* ... */` yorum bloğunun İÇİNDEKİ
kodu (yorum işaretleri olmadan) yapıştır — yani `/api/admin/knowledge/sync`
ve `/api/chat` route'larının ikisini de.

---

## 7) Frontend widget'ı ekle

1. `js/chat-widget.js` dosyasını repo'nun `js/` klasörüne kopyala.
2. `css/chat-widget.css` dosyasını repo'nun `css/` klasörüne kopyala.
3. `index.html`'in `</body>` etiketinden hemen önce şu satırları ekle
   (mevcut script sıralamana göre `api-config.js`'ten sonra olacak şekilde):

```html
<link rel="stylesheet" href="css/chat-widget.css">
<script src="js/api-config.js"></script>
<script src="js/chat-widget.js"></script>
```

> Not: `js/chat-widget.js` `innerHTML` kullanmıyor, tüm DOM `createElement` ile
> kuruluyor — bu yüzden `npm run check` içindeki `security-check.js` kuralını
> (innerHTML yasağı) ihlal etmiyor.

---

## 8) Test et

```bash
npm run check      # syntax + security-check.js
npm run deploy:dry  # gerçek deploy öncesi kuru test
```

Sorun yoksa:

```bash
npm run deploy
```

Deploy sonrası, admin oturumu açıkken bir kere şu endpoint'i çağırarak
Vectorize index'ini doldur:

```bash
curl -X POST https://api.filementorstudio.net/api/admin/knowledge/sync \
  -H "Cookie: admin_session=<oturum-cookie'n>"
```

(Ya da admin paneline küçük bir "Bilgi Tabanını Güncelle" butonu ekleyip
bu endpoint'i oradan tetikleyebilirsin — ürün eklediğinde/düzenlediğinde
tekrar çağırman gerekir.)

---

## 9) PR aç

```bash
git add -A
git commit -m "RAG tabanlı müşteri sohbet botu ekle (Vectorize + Workers AI)"
git push origin feature/rag-chatbot
```

Sonra GitHub'da `feature/rag-chatbot` → `main` için bir Pull Request aç,
`npm run check` CI'ının yeşil geçtiğini doğrula, ve merge et.

---

## Maliyet notu

Cloudflare Workers AI'nin ücretsiz katmanı günlük belirli bir nöron
kotası sunar; bu kota aşılırsa kullanım-bazlı ücretlendirmeye geçer.
Güncel fiyatlandırmayı deploy etmeden önce Cloudflare dashboard'undan
kontrol etmen önerilir. `/api/chat` üzerindeki dakikada-15 rate limit
kötüye kullanımı sınırlamak için eklendi.

/* ============================================================
   RAG CHAT ADDITIONS — Filementor Studio
   Bu dosyanın içeriğini src/worker.js'e ekleyeceksin.
   Nereye ekleneceği docs/PATCH_INSTRUCTIONS.md'de adım adım anlatılıyor.
   ============================================================ */


/* ---------- 1) HELPER FONKSİYONLAR ----------
   Bunları worker.js'in üst kısmına, diğer helper fonksiyonların
   yanına (örn. enforceRateLimit'in hemen altına) ekle. */

const EMBEDDING_MODEL = "@cf/baai/bge-m3";       // çok dilli, Türkçe dahil
const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const VECTOR_TOP_K = 5;
const MAX_CONTEXT_CHARS = 3000;

async function embedText(env, text) {
  const result = await env.AI.run(EMBEDDING_MODEL, { text: [text] });
  const vector = result?.data?.[0];
  if (!Array.isArray(vector)) throw new Error("Embedding üretilemedi.");
  return vector;
}

async function embedBatch(env, texts) {
  // Workers AI tek istekte birden fazla metni embed edebiliyor; yine de
  // aşırı büyük partileri bölerek gönderiyoruz.
  const BATCH_SIZE = 20;
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const result = await env.AI.run(EMBEDDING_MODEL, { text: slice });
    vectors.push(...(result?.data || []));
  }
  return vectors;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Ürünleri ve knowledge_chunks tablosunu D1'den okuyup Vectorize
// index'ini yeniden oluşturur. Admin tarafından tetiklenir.
async function rebuildKnowledgeIndex(env) {
  const [{ results: products }, { results: knowledge }] = await Promise.all([
    env.DB.prepare(
      "SELECT id, name, description, category, price FROM products WHERE active = 1"
    ).all(),
    env.DB.prepare(
      "SELECT id, topic, content FROM knowledge_chunks WHERE active = 1"
    ).all(),
  ]);

  const items = [
    ...products.map(p => ({
      vectorId: `product:${p.id}`,
      text: truncate(
        `Ürün: ${p.name}\nKategori: ${p.category || "Genel"}\nFiyat: ${p.price} TL\nAçıklama: ${p.description || ""}`,
        1500
      ),
      metadata: { type: "product", refId: String(p.id), title: p.name },
    })),
    ...knowledge.map(k => ({
      vectorId: `knowledge:${k.id}`,
      text: truncate(`${k.topic}\n${k.content}`, 1500),
      metadata: { type: "knowledge", refId: String(k.id), title: k.topic },
    })),
  ];

  if (items.length === 0) return { upserted: 0 };

  const vectors = await embedBatch(env, items.map(i => i.text));

  const toUpsert = items.map((item, i) => ({
    id: item.vectorId,
    values: vectors[i],
    metadata: { ...item.metadata, text: item.text },
  }));

  // Vectorize upsert'i tek seferde çok büyük parti kabul etmeyebilir;
  // 50'lik gruplar halinde gönderiyoruz.
  const UPSERT_BATCH = 50;
  for (let i = 0; i < toUpsert.length; i += UPSERT_BATCH) {
    await env.VECTORIZE.upsert(toUpsert.slice(i, i + UPSERT_BATCH));
  }

  return { upserted: toUpsert.length };
}

function validChatMessage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2 || message.length > 500) return "";
  return message;
}


/* ---------- 2) YENİ ROUTE'LAR ----------
   Bunları worker.js'deki mevcut "if (path === ... )" bloklarının
   yanına, try {} bloğunun içine ekle. Tam konum için
   docs/PATCH_INSTRUCTIONS.md'ye bak. */

/*
      // --- Bilgi tabanını (ürünler + SSS) Vectorize'a yeniden yükle ---
      if (path === "/api/admin/knowledge/sync" && request.method === "POST") {
        if (!await isOwner(request, env)) {
          return jsonResponse(request, { error: "Yetkisiz işlem." }, 403);
        }
        try {
          const result = await rebuildKnowledgeIndex(env);
          return jsonResponse(request, { ok: true, ...result });
        } catch (err) {
          return jsonResponse(request, { error: "Senkronizasyon başarısız oldu." }, 500);
        }
      }

      // --- Müşteri sohbet botu (RAG) ---
      if (path === "/api/chat" && request.method === "POST") {
        const body = await readJsonBody(request);
        const message = validChatMessage(body);
        if (!message) {
          return jsonResponse(request, { error: "Mesaj 2-500 karakter arasında olmalı." }, 400);
        }

        let matches;
        try {
          const queryVector = await embedText(env, message);
          const result = await env.VECTORIZE.query(queryVector, {
            topK: VECTOR_TOP_K,
            returnMetadata: "all",
          });
          matches = result?.matches || [];
        } catch (err) {
          return jsonResponse(request, { error: "Şu anda yanıt üretilemiyor, lütfen tekrar deneyin." }, 503);
        }

        const context = truncate(
          matches.map(m => m.metadata?.text || "").filter(Boolean).join("\n\n---\n\n"),
          MAX_CONTEXT_CHARS
        );

        const systemPrompt =
          "Sen Filementor Studio'nun (3D baskı ürünleri satan bir e-ticaret sitesi) müşteri destek asistanısın. " +
          "Sadece aşağıda verilen bağlamdaki bilgileri kullanarak, kısa ve net şekilde Türkçe cevap ver. " +
          "Bağlamda cevap yoksa, bunu net şekilde belirt ve müşteriyi info@filementorstudio.net adresine yönlendir. " +
          "Fiyat veya stok bilgisi verirken bağlamdaki verilerle sınırlı kal, tahmin yürütme.\n\n" +
          `BAĞLAM:\n${context || "(İlgili bağlam bulunamadı.)"}`;

        let answer;
        try {
          const aiResult = await env.AI.run(CHAT_MODEL, {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 400,
          });
          answer = aiResult?.response?.trim();
        } catch (err) {
          return jsonResponse(request, { error: "Şu anda yanıt üretilemiyor, lütfen tekrar deneyin." }, 503);
        }

        if (!answer) {
          answer = "Bu konuda elimde yeterli bilgi yok. Detaylı yardım için info@filementorstudio.net adresine yazabilirsiniz.";
        }

        const sources = matches
          .filter(m => m.score > 0.5)
          .map(m => ({ type: m.metadata?.type, title: m.metadata?.title }));

        // Log — best effort, cevabı geciktirmesin diye hataları yutuyoruz.
        env.DB.prepare(
          "INSERT INTO chat_logs (question, answer, matched_sources) VALUES (?, ?, ?)"
        ).bind(message, answer, JSON.stringify(sources)).run().catch(() => {});

        return jsonResponse(request, { ok: true, answer, sources });
      }
*/

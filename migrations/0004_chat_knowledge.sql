-- Chat knowledge base: editable FAQ / policy text used to feed the RAG chatbot.
-- Product data is already in `products` and is embedded separately by the sync job;
-- this table holds everything else (shipping, returns, filament types, materials, etc).

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,               -- kısa başlık, örn. "Kargo Süresi"
  content TEXT NOT NULL,             -- 200-500 kelimelik anlamlı parça
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_chunks(active);

-- Basit chat kullanım logu (maliyet takibi + kötüye kullanım analizi için).
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  matched_sources TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Örnek başlangıç içeriği — kendi metinlerinle güncelle.
INSERT INTO knowledge_chunks (topic, content) VALUES
  ('Kargo Süresi', 'Siparişler genellikle 1-3 iş günü içinde kargoya verilir. Kargo firması olarak [firma adı] kullanılmaktadır. Türkiye geneline gönderim yapılmaktadır.'),
  ('İade ve Cayma Hakkı', 'Ürünlerinizi teslim aldıktan sonra 14 gün içinde, kullanılmamış ve orijinal ambalajında olmak kaydıyla iade edebilirsiniz. İade talepleri için sipariş numaranızla birlikte info@filementorstudio.net adresine yazabilirsiniz.'),
  ('Filament Türleri', 'PLA, kolay baskı ve düşük ısı gerektirdiği için başlangıç seviyesi kullanıcılara önerilir. PETG daha dayanıklı ve nem/darbeye karşı dirençlidir. ABS yüksek sıcaklık dayanımı gerektiren parçalar için uygundur.');

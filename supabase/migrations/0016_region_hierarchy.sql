-- Bölge hiyerarşisi: Şehir → Bölge ağacı (self-referencing FK)
-- Mevcut bölgeler parent_id = NULL, depth = 0 olarak kalır.
-- Kullanıcı panelden şehir oluşturup mevcut bölgeleri altına taşıyacak.

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES regions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS depth int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS regions_parent_idx ON regions (parent_id);

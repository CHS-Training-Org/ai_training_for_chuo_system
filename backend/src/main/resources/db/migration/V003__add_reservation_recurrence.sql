-- Issue #31: 繰り返し予約
-- 繰り返しの種別（recurrence_type）・終了日（recurrence_until）・系列 ID（series_id）を
-- reservations テーブルに追加する。
-- 既存データへの影響を避けるため、recurrence_type は DEFAULT 'NONE'、他の 2 列は NULL 許容とする。
-- H2（PostgreSQL 互換モード）・PostgreSQL の両方で通る記法のみを使う（V002 と同じ方針）。

ALTER TABLE reservations ADD COLUMN recurrence_type VARCHAR(10) NOT NULL DEFAULT 'NONE';
ALTER TABLE reservations ADD COLUMN recurrence_until DATE;
ALTER TABLE reservations ADD COLUMN series_id UUID;

ALTER TABLE reservations ADD CONSTRAINT chk_reservations_recurrence_type
    CHECK (recurrence_type IN ('NONE', 'WEEKLY', 'MONTHLY'));

-- 種別と series_id・recurrence_until の整合を守る。
--   NONE        : series_id・recurrence_until がともに NULL
--   NONE 以外   : series_id・recurrence_until がともに NOT NULL
ALTER TABLE reservations ADD CONSTRAINT chk_reservations_series
    CHECK (
        (recurrence_type = 'NONE' AND series_id IS NULL AND recurrence_until IS NULL)
        OR (recurrence_type <> 'NONE' AND series_id IS NOT NULL AND recurrence_until IS NOT NULL)
    );

-- シリーズ件数・残り回数の取得用
CREATE INDEX idx_reservations_series_id ON reservations (series_id);

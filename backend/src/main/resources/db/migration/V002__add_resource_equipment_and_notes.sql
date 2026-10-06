-- Issue #25: リソース詳細画面の情報拡充
-- 設備情報（equipment）・利用上の注意（notes）を resources テーブルに追加する。
-- 既存データへの影響を避けるため、両列とも NULL 許容（デフォルト値なし）。

ALTER TABLE resources ADD COLUMN equipment TEXT;
ALTER TABLE resources ADD COLUMN notes TEXT;

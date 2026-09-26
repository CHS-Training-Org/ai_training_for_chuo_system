-- リソース詳細画面の情報拡充（設備一覧・利用上の注意）
-- docs-next/docs/spec/enhancements/beginner/resource-detail-info.md 準拠

ALTER TABLE resources ADD COLUMN equipment TEXT;
ALTER TABLE resources ADD COLUMN notes TEXT;

-- BookFlow 初期データ (seed)
-- 用途：ローカル開発環境での動作確認・STEP-01 環境構築・STEP-04 テスト観点読解
-- 前提：PostgreSQL 16 専用（H2 非対応）。Flyway 対象外のため自動ロードされない。
--       DevContainer 起動後に手動で psql から投入する（実行方法は Docs/guide/getting-started.md §初期データ投入 参照）
-- 再実行：冒頭の DELETE で既存データをクリアしてから INSERT するため再実行可（冪等）

-- ============================================================
-- 既存データのクリア（FK 依存順：子テーブル → 親テーブル）
-- ============================================================
DELETE FROM approval_steps;
DELETE FROM reservations;
DELETE FROM users;
DELETE FROM resources;
DELETE FROM departments;

-- ============================================================
-- 8.1 マスタデータ
-- ============================================================

-- 部署（2 件）
-- 本社（ルート）← 開発部（子）の自己参照 FK を行使
INSERT INTO departments (id, name, parent_id) VALUES
    ('10000000-0000-0000-0000-000000000001', '本社',   NULL),
    ('10000000-0000-0000-0000-000000000002', '開発部', '10000000-0000-0000-0000-000000000001');

-- ユーザー（3 件）：MEMBER / APPROVER / ADMIN 各 1 名
-- cognito_sub は Cognito User Pool のサブ識別子（ローカル開発用ダミー値）
-- 承認者（APPROVER）は 1 名のみ：POST /api/reservations 時の承認者割当が決定的になる
INSERT INTO users (id, cognito_sub, name, email, department_id, role) VALUES
    ('20000000-0000-0000-0000-000000000001', 'cognito-member-001',   '田中 花子', 'hanako.tanaka@example.com',  '10000000-0000-0000-0000-000000000002', 'MEMBER'),
    ('20000000-0000-0000-0000-000000000002', 'cognito-approver-001', '鈴木 一郎', 'ichiro.suzuki@example.com',  '10000000-0000-0000-0000-000000000001', 'APPROVER'),
    ('20000000-0000-0000-0000-000000000003', 'cognito-admin-001',    '管理 太郎', 'taro.kanri@example.com',     '10000000-0000-0000-0000-000000000001', 'ADMIN');

-- リソース（3 件）：ROOM / EQUIPMENT / VEHICLE 各 1 件
-- 第1会議室のみ requires_approval=TRUE（承認フローのサンプルデータ生成に使用）
INSERT INTO resources (id, name, category, capacity, location, requires_approval, is_active, description) VALUES
    ('30000000-0000-0000-0000-000000000001', '第1会議室',      'ROOM',      10,   '3階 東',         TRUE,  TRUE, 'プロジェクター・ホワイトボード完備（承認必要）'),
    ('30000000-0000-0000-0000-000000000002', 'プロジェクターA', 'EQUIPMENT', NULL, '備品室 棚3-A',   FALSE, TRUE, '4K プロジェクター（承認不要）'),
    ('30000000-0000-0000-0000-000000000003', '社用車A',         'VEHICLE',    5,   '地下駐車場 1番', FALSE, TRUE, '普通乗用車・ハイブリッド（承認不要）');

-- ============================================================
-- 8.2 トランザクションデータ（境界値含む）
-- ============================================================

-- 予約（2 件）
-- 重複予約不変条件（§予約 RSVC-01）：
--   status IN ('PENDING','APPROVED') の予約が同一リソース・重複時間帯に複数存在してはならない。
--   → 2 件を別リソース（EQUIPMENT / ROOM）に分散することで不変条件を満たす。
-- STEP-04 テスト観点：同一リソース・重複時間帯での重複チェック検証には別途データを追加すること。

-- ① APPROVED 予約（requires_approval=false リソース上・approval_steps なし）
INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose, attendees_count, status) VALUES
    ('40000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000002',  -- プロジェクターA（EQUIPMENT・requires_approval=false）
     '20000000-0000-0000-0000-000000000001',  -- 田中花子（MEMBER）
     '2026-06-02 10:00:00',
     '2026-06-02 12:00:00',
     '部内勉強会',
     5,
     'APPROVED');

-- ② PENDING 予約（requires_approval=true リソース上・対応 approval_steps あり）
INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose, attendees_count, status) VALUES
    ('40000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000001',  -- 第1会議室（ROOM・requires_approval=true）
     '20000000-0000-0000-0000-000000000001',  -- 田中花子（MEMBER）
     '2026-06-03 14:00:00',
     '2026-06-03 16:00:00',
     '部署合同レビュー',
     8,
     'PENDING');

-- 承認ステップ（1 件）
-- §承認 割当モデル：PENDING 予約生成時に approval_steps を 1 件（step_order=1・APPROVER 割当）生成する。
-- decided_at は NULL（まだ承認・却下されていない状態）。
INSERT INTO approval_steps (id, reservation_id, approver_id, step_order, status, comment, decided_at) VALUES
    ('50000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000002',  -- PENDING 予約（第1会議室）
     '20000000-0000-0000-0000-000000000002',  -- 鈴木一郎（APPROVER）
     1,
     'PENDING',
     NULL,
     NULL);

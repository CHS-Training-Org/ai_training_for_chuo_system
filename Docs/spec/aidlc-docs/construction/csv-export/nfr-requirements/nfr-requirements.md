# NFR Requirements: CSV 帳票出力

## パフォーマンス・スケーラビリティ

- **要件**: 件数上限を設けず全件出力を許容する。データ量に比例したメモリ増加を避けるため、`StreamingResponseBody` + JPQL コンストラクタ式射影 + `@QueryHints` フェッチサイズ指定（500件）で、DB カーソルベースの逐次読み出しを行う
- **既知の制約**: DB コネクションを長時間占有する可能性がある。HikariCP の既定プールサイズ（10）を超える同時ダウンロードがあると他 API が待たされる。チュートリアル規模のデータ量・ADMIN 限定という利用形態では許容範囲と判断し、対応は見送る（`business-logic-model.md` の誤用シナリオ、ADR-033 の Consequences に記録）
- **応答時間の目標値**: 設定しない（チュートリアル用途であり SLA を持たない）

## セキュリティ

- **認可**: `@PreAuthorize("hasRole('ADMIN')")` によるロールベースの機能レベル認可。既存の `ResourceController`・`UserController` と同じ実装パターン
- **入力検証**: `from`/`to` の型検証（`LocalDateTime` 変換失敗時は 400）、`status` の enum 制約、`from > to` の組み合わせ検証（400）
- **データサニタイズ**: CSV インジェクション対策（`business-rules.md` BR-04）
- **Security Baseline 適用結果**: Requirements Analysis で評価済み（SECURITY-01〜15、ブロッキングなし）。SECURITY-10（依存脆弱性スキャン）・SECURITY-11（レート制限）は repo 全体の既存未整備事項として許容

## 信頼性・エラー処理

- **フェイルセーフ**: ストリーム開始前に検証可能なエラー（認可・パラメータ）はすべて弾く。開始後の障害（DB 接続断等）は業務エラーとして扱わず、レスポンス途絶として現れることを許容する（BR-08）
- **リソース解放**: `try-with-resources` で `Stream` を確実にクローズし、JDBC カーソル・`EntityManager` を解放する

## 保守性

- **既存パターンへの準拠**: 4層アーキテクチャ・既存の例外処理（`GlobalExceptionHandler`）・既存のテスト慣習（`@WithMockAdmin` 等）にすべて従う。新しいアーキテクチャパターンを持ち込まない
- **可読性**: `ReservationCsvWriter` を Spring 非依存のプレーンクラスとして切り出し、単体テストしやすい形にする

## ユーザビリティ

- **Excel 互換性**: UTF-8 BOM 付き・日本語ヘッダー・`yyyy/MM/dd HH:mm` 形式の日時（BR-06）
- **エラーフィードバック**: フロントエンドは 403/401/その他をトーストメッセージで区別して表示する

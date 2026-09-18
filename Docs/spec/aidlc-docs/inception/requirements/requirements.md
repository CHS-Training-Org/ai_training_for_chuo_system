# Requirements: CSV 帳票出力

## Intent Analysis Summary

- **User Request**: 管理者が予約一覧・利用実績を CSV 形式でダウンロードできる機能を追加する（エンハンス要求シート [`docs-next/docs/spec/enhancements/intermediate/csv-export.md`](../../../../../docs-next/docs/spec/enhancements/intermediate/csv-export.md)、Issue #29）
- **Request Type**: New Feature（Enhancement。既存の `GET /api/reservations` と並ぶ新規エンドポイント + 新規管理者ページ）
- **Scope Estimate**: Multiple Components（バックエンド4層すべて・フロントエンドの Route Handler とページの双方にまたがる縦切り機能）
- **Complexity Estimate**: Moderate（新規コンポーネントの追加自体は単純だが、`StreamingResponseBody` とトランザクション境界の両立、ブラウザからの認証付きダウンロードという2つの技術的制約への対応が必要）

## 機能要件

`docs-next/docs/spec/enhancements/intermediate/csv-export.md` の RPT-01〜05 を基礎とし、plan mode での調査・確認質問で確定した内容を反映する。

| # | 要件 |
|---|---|
| RPT-01 | `GET /api/reports/reservations/csv` を新設し、`Content-Type: text/csv` で予約一覧を CSV ダウンロードできる |
| RPT-02 | CSV には予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態を含む |
| RPT-03 | 出力対象期間（`from`・`to`。TIMESTAMP・任意・片方のみの指定可）と承認ステータス（`status`。任意・複数指定可）で絞り込める |
| RPT-04 | ADMIN ロールのみアクセスできる（`@PreAuthorize("hasRole('ADMIN')")`） |
| RPT-05 | フロントエンドの新規管理者ページ `/admin/reports` に「CSV ダウンロード」ボタンを設置し、クリックでブラウザにダウンロードさせる |
| RPT-06（新規） | 出力範囲は全ユーザーの予約とする（ADMIN 限定エンドポイントのため、行レベルの所有権チェックは行わない） |

## 非機能要件

| 区分 | 要件 |
|---|---|
| パフォーマンス | 件数上限を設けず `StreamingResponseBody` でストリーミング出力する。バックエンドは JPQL コンストラクタ式による DTO 射影 + `@QueryHints` フェッチサイズ指定で、大量データでもメモリに全件を保持しない |
| セキュリティ（データ） | CSV インジェクション（数式インジェクション）対策として、ユーザー由来の3列（リソース名・申請者名・目的）の先頭が `=` `+` `-` `@` の場合にアポストロフィを付与する |
| セキュリティ（認可） | ADMIN 以外（MEMBER・APPROVER・無認証）からのアクセスはそれぞれ 403・401 を返す。認可の権威はバックエンドの `@PreAuthorize` に一本化し、フロントエンドの Route Handler では再判定しない |
| 互換性 | CSV は UTF-8 BOM 付きとし、Excel で開いたときに日本語ヘッダと日時が正しく表示される（日時は `yyyy/MM/dd HH:mm` 形式） |
| 一貫性 | 新規コンポーネントは既存の4層アーキテクチャ・既存の例外処理（`GlobalExceptionHandler`）・既存のテスト慣習（`@WithMockAdmin` 等）に従う |

## 確認質問と回答（AskUserQuestion、plan mode 内で実施）

| 論点 | 決定 |
|---|---|
| CSV 生成ライブラリ | opencsv 5.12.0 を採用（手書き `StringBuilder` ではない） |
| ボタン配置先 | 新規ページ `/admin/reports` |
| 出力範囲 | 全ユーザーの予約 |
| 期間パラメータの型 | TIMESTAMP（`LocalDateTime`、既存 `/api/resources/{id}/availability` と同じ無注釈の変換方式）。片方のみの指定を許可する点は `/availability` の「同時指定必須」から意図的に差を付ける |
| 大量データ対策 | `StreamingResponseBody`。件数上限は設けない |
| CSV インジェクション対策 | 入れる |
| ADR 起票 | ADR-033 を起票する |
| ユースケース番号 | UC-09 として新設し、エンハンス要求シートの誤った UC-07 参照も修正する |
| AI-DLC の進め方 | ステージを続行する |

## 拡張機能（Extension）の採否

| Extension | 判断 | 理由 |
|---|---|---|
| Security Baseline | **有効化** | ADMIN 限定の新規エンドポイントであり、CSV インジェクション対策・認可設計をセキュリティ観点で明示的にレビューする価値がある |
| Resiliency Baseline | 無効 | 単一エンドポイントの帳票出力機能であり、高可用性・災害復旧の全面的な検討は過剰 |
| Property-Based Testing | 無効 | `ReservationCsvWriter` は項目数固定の例型テスト（BOM・ヘッダー・列順・インジェクション対策など）で十分に検証できる |

### Security Baseline 適用結果（SECURITY-01〜15）

本機能は既存の稼働中アプリケーションへの単一エンドポイント追加であり、クラウドインフラ・認証基盤・ネットワーク構成には変更を加えない。該当しないルールは N/A とする。

| ルール | 判定 | 根拠 |
|---|---|---|
| SECURITY-01（保存時・転送時暗号化） | N/A | 新規データストアを作らない。既存 PostgreSQL の暗号化方針は本タスクのスコープ外 |
| SECURITY-02（ネットワーク中継の access log） | N/A | 新規ロードバランサ・API Gateway・CDN を作らない |
| SECURITY-03（アプリケーションログ） | **準拠** | 新規クラスは既存の構造化ログ（ADR-017・logstash-logback-encoder）に従う。`GlobalExceptionHandler` が既存の集中ログ経路 |
| SECURITY-04（HTTP セキュリティヘッダー） | N/A | レスポンスは `text/csv` であり HTML を返さない |
| SECURITY-05（入力検証） | **準拠** | `from`/`to` は型検証（`LocalDateTime` 変換失敗は 400）、`status` は enum 制約、`purpose` 等はサニタイズ（CSV インジェクション対策）。SQL は JPQL の名前付きパラメータのみで文字列結合なし |
| SECURITY-06（最小権限 IAM） | N/A | クラウド IAM ポリシーの変更なし |
| SECURITY-07（ネットワーク構成） | N/A | ネットワーク設定の変更なし |
| SECURITY-08（アプリケーション層アクセス制御） | **準拠** | Deny by default（`SecurityConfig` の `anyRequest().authenticated()`）、`@PreAuthorize("hasRole('ADMIN')")` によるロールベースの機能レベル認可（既存の `ResourceController`・`UserController` と同型）。オブジェクトレベル認可は対象外（URL にリソース ID を含まない集計データであり、ADMIN が全件アクセス可能なのは既存の `GET /api/reservations` と同じ設計） |
| SECURITY-09（ハードニング・設定不備防止） | **準拠** | エラー応答は既存の `GlobalExceptionHandler`／認証・認可ハンドラが汎用メッセージのみを返し、スタックトレースを露出しない。opencsv は現行の安定版（5.12.0）を使用 |
| SECURITY-10（サプライチェーンセキュリティ） | **N/A（既存の repo 全体の未整備事項。本タスクでは新規導入しない）** | 確認の結果、`.github/` に Dependabot・Renovate 等の依存脆弱性スキャンが存在しないことが判明した。これは本タスク以前からの repo 全体の状態であり、単一ライブラリ追加によって悪化するものではない。opencsv のバージョンは pin する（`5.12.0` を明示指定）。スキャン導入は別 Issue として起票することを推奨する |
| SECURITY-11（セキュアな設計原則） | **一部未対応（許容）** | レート制限は本エンドポイントにも既存のどのエンドポイントにも実装されていない。本機能単独でレート制限を追加すると既存エンドポイントとの一貫性を欠くため、repo 全体の課題として切り離す。誤用シナリオ（大量データ・長時間接続によるコネクション占有）は Consequences として ADR-033 に記録済み |
| SECURITY-12（認証・資格情報管理） | N/A | 新しい認証フローを追加しない。既存の Cognito/JWT 基盤をそのまま利用 |
| SECURITY-13（ソフトウェア・データ完全性） | N/A | 信頼できないデータのデシリアライズなし。CDN からのリソース読み込みなし |
| SECURITY-14（アラート・監視） | N/A | 新規アラート基盤の追加は本タスクのスコープ外。既存の CloudWatch 監視方針を変更しない |
| SECURITY-15（例外処理・フェイルセーフ） | **準拠（既知の制約を明記）** | `try-with-resources` でストリームを確実にクローズ、認可失敗は fail closed、エラーメッセージは汎用化。ただし CSV ストリーミング開始後（レスポンスコミット後）の例外は JSON エラーとして返せず、クライアントは途中で切れた CSV を受け取る。この制約は `api-spec.md` に明記し、隠さない |

**ブロッキングな Security Finding はない。** SECURITY-10・SECURITY-11 は repo 全体の既存課題であり、本タスクの差分で新たに生じたものではないため N/A／許容と判断した。

## サマリー

CSV 帳票出力は、既存の予約ドメイン（4層アーキテクチャ）に新規コンポーネント（`ReportController` / `ReservationReportService` / `ReservationCsvWriter` / `ReservationCsvRow`）を追加し、フロントエンドに新規ページ（`/admin/reports`）と Route Handler（`/api/reports/reservations/csv`）を追加する形で実装する。技術的な核心は、`StreamingResponseBody` の非同期コールバックとトランザクション境界の両立（JPQL 射影による LAZY 関連の排除）と、ブラウザから認証付きでファイルをダウンロードさせるための BFF 層（Route Handler によるストリーミングプロキシ）の2点である。詳細な実装設計は Application Design ステージで確定する。

# Requirements（CSV 帳票出力）

## Intent Analysis Summary
- **User Request**: `/aidlc` で `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（Issue #29）に取り組む。
- **Request Type**: New Feature（新規エンドポイントと画面の追加）
- **Scope Estimate**: Multiple Components（backend と frontend、仕様書）
- **Complexity Estimate**: Moderate
- **Requirements Depth**: Standard
- **Input**: ビジネス要求シート、確認質問 12 問への回答（`requirement-verification-questions.md`）、リバースエンジニアリング成果物

## Extension Configuration
| Extension | Enabled |
|---|---|
| Security Baseline | No |
| Resiliency Baseline | No |
| Property-Based Testing | No |

## Functional Requirements

### Backend
| ID | 要件 |
|---|---|
| RPT-01 | `GET /api/reports/reservations/csv` を新設し、`Content-Type: text/csv; charset=UTF-8` で予約一覧を返す。`Content-Disposition: attachment` でファイル名を指定する |
| RPT-02 | CSV の列は 日本語ヘッダ行 + 予約 ID、リソース名、申請者名、開始日時、終了日時、目的、承認状態。承認状態は予約ステータス（`reservations.status`）の日本語ラベル（承認待ち、承認済み、却下、キャンセル済み、ドラフト。画面の `RESERVATION_STATUS_LABELS` と同じ）で出す（Q1=A。Code Generation で画面の実ラベルに合わせて「キャンセル」「下書き」から修正した） |
| RPT-03a | `status` は複数指定可（`?status=PENDING&status=APPROVED`）。未指定なら全ステータス（Q2=A） |
| RPT-03b | 期間は `from` / `to`（日付、`yyyy-MM-dd`）。基準は利用開始日時（`start_at`）。両端を含み、`from` は当日 0 時以上、`to` は翌日 0 時未満として扱う。片方だけの指定も可、両方省略なら全期間（Q3=A、Q4=A） |
| RPT-03c | `from` が `to` より後なら 400 `VALIDATION_ERROR`。日付形式が不正でも 400 |
| RPT-04 | ADMIN のみアクセス可。`@PreAuthorize("hasRole('ADMIN')")` で保護し、MEMBER と APPROVER は 403 `FORBIDDEN`、未認証は 401 |
| RPT-05 | 文字コードは UTF-8 の BOM 付き。値は RFC 4180 に沿ってエスケープする（カンマ、改行、二重引用符を含む値は引用符で囲む）。行区切りは CRLF |
| RPT-06 | 日時は `yyyy-MM-dd HH:mm` 形式で出す（Q6=A） |
| RPT-07 | 先頭が `=`、`+`、`-`、`@` の文字列値は、先頭に `'` を付けて数式として実行されないようにする（Q8=A）。対象は文字列列（リソース名、申請者名、目的）とする |
| RPT-08 | 並び順は開始日時の昇順、同値なら ID の昇順とし、出力を再現可能にする |
| RPT-09 | ファイル名は `from` と `to` の両方があるとき `reservations_<from>_<to>.csv`（日付は `yyyyMMdd`）、それ以外は `reservations_<出力日>.csv`（Q7=B） |
| RPT-10 | 対象 0 件でもヘッダ行のみの CSV を返す（200） |

### Frontend
| ID | 要件 |
|---|---|
| RPT-11 | 新しい管理者ページ `/admin/reservations` を作る。期間（開始日、終了日）、ステータス（複数選択）の入力欄と「CSV ダウンロード」ボタンを置く（Q5=B） |
| RPT-12 | サイドナビの ADMIN メニューに「予約帳票」（仮称）を追加する。`/admin/*` の既存の ADMIN ガード（403 画面）を使う |
| RPT-13 | ボタン押下でブラウザが CSV ファイルをダウンロードする。JWT がサーバー側にあるため、ダウンロードの経路はサーバー経由とする（方式は Application Design で決める） |
| RPT-14 | バックエンドが返したエラー（400、403 など）は、ダウンロードを開始せず画面に通知する |

### Specification（Spec-first）
| ID | 要件 |
|---|---|
| RPT-15 | `api-spec.md` に §帳票出力を追加する（エンドポイント一覧、パラメータ、レスポンス、エラー） |
| RPT-16 | `screen-spec.md` に `/admin/reservations` と、画面一覧、権限、サイドナビの項目を追加する |
| RPT-17 | `requirements.md`（要件定義書）の API 権限マトリクスと画面アクセス権限に行を追加する。UC 番号は変更しない（Q9=A、Issue #162 で別途扱う） |
| RPT-18 | `enhancements/intermediate/csv-export.md` の影響範囲の記述が実態と合うか確認する（`/admin/resources` ではなく `/admin/reservations` に置くため） |

## Non-Functional Requirements
- **Security**: ADMIN のみ。CSV の数式インジェクション対策（RPT-07）。個人名を含むため、ログに CSV 本文を出さない。
- **Performance**: 件数の上限は設けない。大量データ時の方式（一括かストリーミングか）は Application Design で決める。
- **Usability**: Excel で文字化けしない（BOM 付き UTF-8）。
- **Maintainability**: 4 レイヤーを守り、CSV 生成ロジックは単体テスト可能な形で分離する。
- **Compatibility**: 既存の `GET /api/reservations` の挙動は変えない。

## Testing Requirements
- Backend: CSV 生成ロジックのユニットテスト（ヘッダ、BOM、エスケープ、数式対策、日時書式、0 件）。Controller 結合テスト（ADMIN の 200、MEMBER と APPROVER の 403、期間とステータスの絞り込み、不正パラメータの 400）。
- Frontend: Server Action または Route Handler の Vitest（MSW）。ナビ項目のテスト更新（`nav-items.test.ts`）。
- 検証コマンド: `./gradlew checkstyleMain test`、`pnpm lint`、`pnpm format:check`、`pnpm test`、`npm run build`（docs-next）。

## Out of Scope
- 利用実績の集計、グラフ（別課題 `usage-statistics`）
- 予約一覧の絞り込み拡張（別課題 `reservation-list-filter`）
- UC 番号の食い違いの解消（Issue #162）
- PBT、セキュリティ拡張、レジリエンス拡張

## Assumptions and Open Items for Later Stages
- ダウンロード方式（Route Handler か Server Action か）と、一括かストリーミングかは Application Design で決める。
- 期間の `to` を翌日 0 時未満として扱う実装は、`ReservationRepository` への新規クエリ（または Specification）で行う。
- 予約帳票ページの名称（ナビの表示名）は仮称。

## Traceability
- シートの RPT-01〜05 は RPT-01〜10 に分割・具体化した。
- シートの受入条件 5 件は、RPT-11/13（ダウンロード）、RPT-02/05（ヘッダと BOM）、RPT-03/11（絞り込み）、RPT-04（403）、テスト要件に対応する。

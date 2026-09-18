# Code Generation Summary — reservation-draft（Issue #30）

## 変更ファイル一覧

### Docs（Spec Update, Step 1）

| ファイル | 変更内容 |
|---|---|
| `docs-next/docs/spec/requirements.md` | §共通の注記更新、UC-03に「下書き保存」節（RSV-08〜11）追加、重複予約チェック仕様への注記、API権限マトリクスのGET/PUT行更新 |
| `docs-next/docs/spec/api-spec.md` | エンドポイント一覧のPUT説明、statusクエリパラメータ・レスポンス型のstatus説明、POST/PUTセクションへの`draft`/`submit`フィールドと「下書き保存」「下書きの正式申請」節を追加 |
| `docs-next/docs/spec/er-diagram.md` | `reservations.status`カラムの備考更新（「未使用」注記の削除） |
| `docs-next/docs/spec/screen-spec.md` | `/reservations/new`・`/reservations`・`/reservations/{id}`・`/reservations/{id}/edit`の4セクション更新 |
| `docs-next/static/diagrams/spec/requirements-reservation-status.drawio` | DRAFT状態と4本の遷移（下書き保存／正式申請×2／キャンセル）を追加。**`.drawio.svg`は環境制約により未再生成（下記「既知の未完了事項」参照）** |

### Backend

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `domain/Reservation.java` | Modified | `markPending()` 追加（既存の`cancel()`/`markApproved()`/`markRejected()`と同じ無条件セッターパターン） |
| `application/ReservationService.java` | Modified | `create()`にdraft分岐、`update()`にsubmit分岐・`UPDATABLE_STATUSES`拡張・不正遷移ガード・`submitDraft()`ヘルパー、`cancel()`の`CANCELLABLE_STATUSES`にDRAFT追加、`checkReadAccess()`にDRAFT限定のAPPROVER制限 |
| `presentation/dto/CreateReservationRequest.java` | Modified | `draft`フィールド追加 |
| `presentation/dto/UpdateReservationRequest.java` | Modified | `submit`フィールド追加 |
| `presentation/ReservationController.java` | 無変更 | 既存実装が`req`をそのままServiceへ渡すため変更不要 |
| `test/.../ReservationServiceTest.java` | Modified | ケース追加（Create 2・Get 3・Update 6・Cancel 2）。うちUpdateの2件はレビュー指摘（下記参照）への対応で追加 |
| `test/.../ReservationControllerTest.java` | Modified | DRAFT予約2件のseedデータ追加、ケース追加。うち1件はレビュー指摘（下記参照）への対応で追加 |

### Frontend

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `lib/schemas/reservation.ts` | Modified | `CreateReservationSchema`に`draft`、`UpdateReservationSchema`に`submit`を追加 |
| `server/actions/reservations.ts` | 無変更 | `{ ...input, ... }`で展開する既存実装のため変更不要 |
| `reservations/new/ReservationForm.tsx` | Modified | 「下書き保存」ボタン追加、`handleSubmit`をdraft引数対応に変更 |
| `reservations/page.tsx` | Modified | `ALL_STATUSES`に`"DRAFT"`追加（ラベル・バッジ色は既存エントリを流用） |
| `reservations/[id]/page.tsx` | Modified | `canEdit`/`CANCELLABLE_STATUSES`をDRAFTに拡張、`canSubmit`追加、`SubmitButton`配置 |
| `reservations/[id]/SubmitButton.tsx` | Created | 下書きの正式申請ボタン（確認ダイアログ付き。保存済みの値をそのまま`submit: true`で送信） |
| `reservations/[id]/edit/page.tsx` | Modified | `notFound`ガードをPENDING∪DRAFTに拡張、DRAFT時の見出し・説明文を出し分け |
| `reservations/[id]/edit/ReservationEditForm.tsx` | 無変更 | `submit`を送らないため既存実装のまま |
| `tests/unit/msw/handlers.ts` | Modified | POST/PUTハンドラを`body.draft`/`body.submit`に応じたstatus分岐に変更 |
| `tests/unit/server/actions/reservations.test.ts` | Modified | 3ケース追加（draft作成・submit正式申請・422） |

## 要件トレーサビリティ

| 要求シート ID | requirements.md 採番 | 実装箇所 |
|---|---|---|
| RSV-01 | RSV-08 | `ReservationService.create()` |
| RSV-02（閲覧・編集） | RSV-09 | `ReservationService.checkReadAccess()` |
| RSV-03 | RSV-10 | `ReservationService.update()`／`submitDraft()`／`Reservation.markPending()` |
| RSV-02（削除） | RSV-11 | `ReservationService.cancel()`（`CANCELLABLE_STATUSES`） |
| RSV-04 | — | `ReservationForm.tsx`（下書き保存ボタン） |
| RSV-05 | — | `reservations/page.tsx`（`ALL_STATUSES`） |

## 検証結果

| 検証 | 結果 |
|---|---|
| `./gradlew compileJava` | 成功 |
| `./gradlew test --tests "*ReservationServiceTest"` | 32件成功 |
| `./gradlew test --tests "*ReservationControllerTest"` | 30件成功 |
| `./gradlew spotlessCheck checkstyleMain checkstyleTest` | 成功（exit 0。checkstyleの警告は既存のADR-018テスト命名規約に対する既存警告） |
| `pnpm lint` | 成功 |
| `pnpm test` | 全85件成功 |
| `node_modules/.bin/tsc --noEmit` | 成功（型エラーなし） |
| `cd docs-next && npm run build` | 成功（exit 0、brokenLinks/brokenAnchorsエラーなし） |
| `pnpm build`（フロントエンド本ビルド） | 成功（再試行時にネットワーク回復。全11ルートの静的生成完了。詳細は下記「未完了事項の再実行」参照） |

## レビュー指摘への対応（Step 14完了後・advisorレビュー）

Code Generation完了報告の直前に`advisor`ツールでセルフレビューを行い、以下3点を修正した（テスト・lintでは検出できない、spec文書間の矛盾とコード-spec間の矛盾）。

1. **spec内の矛盾（ADMINのDRAFT編集可否）**：`requirements.md`のRSV-09と`api-spec.md`の「下書き保存」節が「DRAFTはADMINも編集可」と記述していたが、実装（`update()`に ADMIN 例外なし）および`personas.md`は「ADMIN は閲覧・キャンセルのみ可、編集・正式申請は不可」としており矛盾していた。両ファイルの文言を実装に合わせて修正した（APIの権限マトリクス表自体は元々正しかった）。
2. **下書きの重複予約チェックの非対称性**：`create()`は`draft=true`のとき重複チェックをスキップする（D5）一方、`update()`は`submit`の値に関わらず常にチェックを実行していたため、「重複していても下書き保存はできるが、時間帯を変えない限り再編集はできない」という非対称な挙動になっていた。`update()`側で「対象がDRAFTかつsubmit=false（下書きの再編集）」の場合のみチェックをスキップするよう修正し、作成時と対称にした（正式申請時（submit=true）は引き続きチェックを実行する。D7の意図どおり）。`business-rules.md`・`requirements.md`・`api-spec.md`の記述も合わせて更新し、この非対称性を検証できていなかったテストギャップを埋めるケースを追加した（`ReservationServiceTest`に2件、`ReservationControllerTest`に1件）。
3. **javadocの陳腐化**：`ReservationService`/`Reservation`/`ReservationController`のjavadocに残っていた「PUTはPENDINGのみ」「cancelはPENDING/APPROVEDのみ」等の記述を、DRAFT対応後の実際の挙動に合わせて更新した。あわせて private メソッドへの`{@link #submitDraft}`参照を`{@code submitDraft}`に修正した（javadocタスクでの警告を避けるため）。

なお、drawioの`.svg`未更新（下記参照）については、advisorから「本文とドキュメント埋め込み図が矛盾したまま公開される」という指摘があった。テキストによる代替表現の追加は行わず、下記の既知の未完了事項として利用者に再エクスポートを依頼する方針を維持した。

## 未完了事項の再実行（Step 14完了報告後）

完了報告後、利用者の指示により未完了事項2件の再実行を試みた。

1. **`pnpm build`（フロントエンド本ビルド）→ 解消**：この時点でネットワークが回復しており（`fonts.googleapis.com`への疎通を確認済み）、`.next`を削除して再実行したところ、Google Fontsの取得は数分間ECONNREFUSED/ETIMEDOUTのリトライを繰り返したものの最終的に成功し、`✓ Compiled successfully in 10.9min`のあと全11ルートの静的ページ生成・ビルドトレース収集まで完走した（exit 0）。この未完了事項は解消済みとして扱う。
2. **`requirements-reservation-status.drawio.svg`の再生成 → 解消**：`apt-get install python3`でstdlibの`xml`/`json`が使えるようになり、`validate.py`による構造検証は実行できるようになった（0 error(s), 0 warning(s)）。実際のSVG画像のエクスポートはBookFlowの方針上VSCode拡張／ブラウザのGUI操作に限定されておりこの環境では自動化できなかったため、利用者にVSCodeのdrawio拡張での再エクスポートを依頼し、対応いただいた。再生成後のSVGにDRAFT状態（および関連4遷移）が反映されていることを`grep`で確認済み（`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`/`DRAFT`各3箇所、ファイル更新日時も`.drawio`ソースより新しいことを確認）。この未完了事項は解消済みとして扱う。

これにより、Code Generation完了報告時点で残っていた既知の未完了事項2件はいずれも解消した。

# 予約申請フォーム（`/reservations/new`）試験観点一覧

| 項目 | 内容 |
|---|---|
| 対象画面 | 予約申請フォーム（`/reservations/new`） |
| 対象工程 | 結合テスト（E2E） |
| ID 略号 | `RSV-NEW` |
| 参照した仕様書 | `docs-next/docs/spec/screen-spec.md`、`docs-next/docs/spec/requirements.md`、`docs-next/docs/spec/api-spec.md`、`docs-next/docs/spec/er-diagram.md` |
| 作成日 | 2026-09-30 |

この一覧は試験観点のたたき台である。人がレビューして確定させたうえで、試験ケースへ展開する。

## 1. 根拠にした仕様

| # | 仕様の内容 | 記載元 | 区分 |
|---|---|---|---|
| 1 | 予約申請フォームは MEMBER、APPROVER、ADMIN のすべてが開ける | requirements.md「§共通 > ロール・権限定義 > 画面アクセス権限」、screen-spec.md「画面一覧」 | 確定 |
| 2 | リソース詳細から遷移したときは、リソース ID をクエリパラメータで受け取り、リソース選択欄に初期値として設定する | screen-spec.md「§予約 > `/reservations/new` > UI 要素」の注記、screen-spec.md「§リソース > `/resources/{id}` > UI 要素」 | 確定 |
| 3 | リソース選択の選択肢は「有効リソース一覧」であり、MEMBER と APPROVER には無効なリソースが出ない | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§リソース > UC-02」RES-02、api-spec.md「§リソース > `GET /api/resources` > クエリパラメータ」の注記 | 確定 |
| 4 | ADMIN のとき、リソース選択の選択肢に無効なリソースを含めるか。画面の節は「有効リソース一覧」と書き、要件と API は ADMIN には無効なリソースも返すと書いている | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§リソース > UC-02」RES-02、api-spec.md「§リソース > `GET /api/resources` > クエリパラメータ」の注記 | 矛盾 |
| 5 | 「リソース未選択は申請不可」 | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」 | 確定 |
| 6 | 開始日時と終了日時は「両方の入力が必要」 | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」 | 確定 |
| 7 | 利用目的は必須 | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§予約 > UC-03 > 入力項目」 | 確定 |
| 8 | 利用目的は「255 文字以内」 | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」、requirements.md「§予約 > UC-03 > 入力項目」、er-diagram.md「エンティティ定義 > reservations」 | 確定 |
| 9 | 参加人数は任意 | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§予約 > UC-03 > 入力項目」 | 確定 |
| 10 | 参加人数は「1 以上」 | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 確定 |
| 11 | 「終了日時は開始日時より後であること」 | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」、api-spec.md「§予約 > `POST /api/reservations` > リクエスト」、er-diagram.md「エンティティ定義 > reservations」 | 確定 |
| 12 | 同じリソースに承認待ちか承認済みの予約があり、その開始が新しい予約の終了より前で、かつその終了が新しい予約の開始より後なら、申請を拒否する（端が接するだけなら重ならない） | requirements.md「§予約 > 重複予約チェック仕様」、api-spec.md「§予約 > 申請シーケンス図（2 パターン）」の注記 [1] | 確定 |
| 13 | 重複予約で拒否されたときは「指定した時間帯は既に予約が入っています」を表示する | screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 確定 |
| 14 | 申請に成功すると、マイ予約一覧（`/reservations`）へリダイレクトする | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」 | 確定 |
| 15 | 承認が不要なリソースの予約は承認済み（即時確定）、承認が必要なリソースの予約は承認待ちになる | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」、requirements.md「§予約 > UC-03 > ステータス初期値」「§予約 > UC-04」、api-spec.md「§予約 > `POST /api/reservations` > レスポンス」 | 確定 |
| 16 | 承認が必要なリソースで申請すると承認ステップが作られ、承認者の承認待ち一覧に表示される。承認が不要なリソースでは作られない | requirements.md「§承認 > UC-05」「§予約 > UC-04」、screen-spec.md「§承認 > `/approvals` > UI 要素」 | 確定 |
| 17 | マイ予約一覧はリソース名、日時、目的、ステータスバッジを表示し、「承認待ち（PENDING）」「承認済み（APPROVED）」などのステータスフィルターのタブを持つ | screen-spec.md「§予約 > `/reservations` > UI 要素」 | 確定 |
| 18 | 予約詳細は参加人数を表示する | screen-spec.md「§予約 > `/reservations/{id}` > UI 要素」、requirements.md「§予約 > UC-07」RSV-03 | 確定 |
| 19 | 承認が必要なリソースの申請時に承認者ロールのユーザーがいなければ、申請を拒否する | api-spec.md「§予約 > `POST /api/reservations` > レスポンス」 | 確定 |
| 20 | 存在しないリソース ID での申請は拒否する | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 確定 |

「記載なし」の項目はこの表に入れず、4.2 にだけ書く。

## 2. 試験観点

### 2.1 画面アクセス・認可

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-001 | MEMBER でサインインして開くと、予約申請フォームが表示されること | requirements.md「§共通 > ロール・権限定義 > 画面アクセス権限」、screen-spec.md「画面一覧」 |  |
| RSV-NEW-VP-002 | APPROVER でサインインして開くと、予約申請フォームが表示されること | requirements.md「§共通 > ロール・権限定義 > 画面アクセス権限」、screen-spec.md「画面一覧」 |  |
| RSV-NEW-VP-003 | ADMIN でサインインして開くと、予約申請フォームが表示されること | requirements.md「§共通 > ロール・権限定義 > 画面アクセス権限」、screen-spec.md「画面一覧」 |  |

### 2.2 初期表示

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-004 | リソース詳細の「このリソースを予約する」ボタンから開くと、リソース選択にそのリソースが選ばれた状態で表示されること | screen-spec.md「§予約 > `/reservations/new` > UI 要素」の注記、screen-spec.md「§リソース > `/resources/{id}` > UI 要素」 |  |

### 2.3 リソース選択

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-005 | MEMBER で開くと、リソース選択の選択肢に無効なリソースが含まれないこと | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§リソース > UC-02」RES-02、api-spec.md「§リソース > `GET /api/resources` > クエリパラメータ」の注記 | 前提：無効なリソースを1件以上用意する |
| RSV-NEW-VP-006 | APPROVER で開くと、リソース選択の選択肢に無効なリソースが含まれないこと | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§リソース > UC-02」RES-02、api-spec.md「§リソース > `GET /api/resources` > クエリパラメータ」の注記 | 前提：無効なリソースを1件以上用意する。ADMIN の扱いは RSV-NEW-Q-001 で保留 |
| RSV-NEW-VP-007 | リソースを選ばずに申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」 | 他の項目は正しく入れる |

### 2.4 開始日時・終了日時

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-008 | 開始日時を入れずに申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」 | 他の項目は正しく入れる |
| RSV-NEW-VP-009 | 終了日時を入れずに申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」 | 他の項目は正しく入れる |

### 2.5 利用目的

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-010 | 利用目的を入れずに申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§予約 > UC-03 > 入力項目」 | 他の項目は正しく入れる |
| RSV-NEW-VP-011 | 利用目的に255文字を入れて申請すると、申請できること | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」、requirements.md「§予約 > UC-03 > 入力項目」 | 境界の一致点 |
| RSV-NEW-VP-012 | 利用目的に256文字を入れて申請すると、申請できないこと | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」、requirements.md「§予約 > UC-03 > 入力項目」 | 境界の外側 |

### 2.6 参加人数

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-013 | 参加人数を入れずに申請すると、申請できること | screen-spec.md「§予約 > `/reservations/new` > UI 要素」、requirements.md「§予約 > UC-03 > 入力項目」 |  |
| RSV-NEW-VP-014 | 参加人数に1を入れて申請すると、申請できること | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 境界の一致点 |
| RSV-NEW-VP-015 | 参加人数に0を入れて申請すると、申請できないこと | api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 境界の外側 |

### 2.7 開始日時と終了日時の前後関係

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-016 | 終了日時を開始日時より後（入力できる最小の差）にして申請すると、申請できること | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」、api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 境界の内側。入力の単位は仕様に記載なし（4.2） |
| RSV-NEW-VP-017 | 終了日時を開始日時と同じにして申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」、api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 境界の一致点 |
| RSV-NEW-VP-018 | 終了日時を開始日時より前にして申請すると、申請できないこと | screen-spec.md「§予約 > `/reservations/new` > バリデーション」、requirements.md「§予約 > UC-03 > 入力項目」、api-spec.md「§予約 > `POST /api/reservations` > リクエスト」 | 境界の外側 |

### 2.8 重複予約

備考の「既存予約」は、申請するリソースと同じリソースの承認済みの予約（例：10:00〜12:00）とする。

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-019 | 既存予約と同じ時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 例：10:00〜12:00 |
| RSV-NEW-VP-020 | 既存予約の開始より前に終わる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 完全に前。例：8:00〜9:00 |
| RSV-NEW-VP-021 | 既存予約の開始時刻ちょうどに終わる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 前で接する。例：9:00〜10:00 |
| RSV-NEW-VP-022 | 既存予約の開始時刻をまたぐ時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 前側で一部重なる。例：9:00〜11:00 |
| RSV-NEW-VP-023 | 既存予約をすっぽり含む時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 内包する。例：9:00〜13:00 |
| RSV-NEW-VP-024 | 既存予約の内側に収まる時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 内包される。例：10:30〜11:30 |
| RSV-NEW-VP-025 | 既存予約の終了時刻をまたぐ時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 後側で一部重なる。例：11:00〜13:00 |
| RSV-NEW-VP-026 | 既存予約の終了時刻ちょうどに始まる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 後で接する。例：12:00〜13:00 |
| RSV-NEW-VP-027 | 既存予約の終了より後に始まる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 完全に後。例：13:00〜14:00 |
| RSV-NEW-VP-028 | 同じリソースの承認待ちの予約と重なる時間帯で申請すると、「指定した時間帯は既に予約が入っています」と表示され申請できないこと | requirements.md「§予約 > 重複予約チェック仕様」、screen-spec.md「§予約 > `/reservations/new` > バリデーション」 | 既存予約を承認待ちにして確かめる |
| RSV-NEW-VP-029 | 同じリソースの却下された予約と重なる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 既存予約を却下にして確かめる |
| RSV-NEW-VP-030 | 同じリソースのキャンセル済みの予約と重なる時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 | 既存予約をキャンセル済みにして確かめる |
| RSV-NEW-VP-031 | 別のリソースの承認済みの予約と同じ時間帯で申請すると、申請できること | requirements.md「§予約 > 重複予約チェック仕様」 |  |

### 2.9 申請後の結果と画面遷移

| ID | 試験観点 | 仕様根拠 | 備考 |
|---|---|---|---|
| RSV-NEW-VP-032 | 正しく入力して申請すると、マイ予約一覧へ移ること | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」 |  |
| RSV-NEW-VP-033 | 正しく入力して申請すると、マイ予約一覧に、申請したリソース名、日時、目的の予約が表示されること | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」、screen-spec.md「§予約 > `/reservations` > UI 要素」 |  |
| RSV-NEW-VP-034 | 参加人数を入れて申請すると、その予約の予約詳細に、入れた参加人数が表示されること | screen-spec.md「§予約 > `/reservations/{id}` > UI 要素」、requirements.md「§予約 > UC-07」RSV-03 | マイ予約一覧には参加人数が出ないため、予約詳細で確かめる |
| RSV-NEW-VP-035 | 承認が不要なリソースで申請すると、マイ予約一覧の「承認済み（APPROVED）」タブにその予約が表示されること | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」、requirements.md「§予約 > UC-04」、screen-spec.md「§予約 > `/reservations` > UI 要素」 |  |
| RSV-NEW-VP-036 | 承認が必要なリソースで申請すると、マイ予約一覧の「承認待ち（PENDING）」タブにその予約が表示されること | screen-spec.md「§予約 > `/reservations/new` > 申請後フロー」、requirements.md「§予約 > UC-03 > ステータス初期値」、screen-spec.md「§予約 > `/reservations` > UI 要素」 |  |
| RSV-NEW-VP-037 | 承認が必要なリソースで申請すると、承認者の承認待ち一覧にその予約が表示されること | requirements.md「§承認 > UC-05」、screen-spec.md「§承認 > `/approvals` > UI 要素」 | APPROVER でサインインし直して承認待ち一覧を見る |
| RSV-NEW-VP-038 | 承認が不要なリソースで申請すると、承認者の承認待ち一覧にその予約が表示されないこと | requirements.md「§予約 > UC-04」、requirements.md「§予約 > UC-03 > ステータス初期値」 | APPROVER でサインインし直して承認待ち一覧を見る |

## 3. 確認しない観点

| ID | 観点 | 理由 | 補足 |
|---|---|---|---|
| RSV-NEW-EX-001 | 未認証で開くと、サインイン画面へ移ること | 共通の観点で担保 | 全要認証画面に共通の扱いで、この画面の節に固有の記述はない |
| RSV-NEW-EX-002 | ヘッダーとサイドナビがロールに応じて表示されること | 共通の観点で担保 | 共通レイアウトの振る舞いで、この画面に固有の記述はない |
| RSV-NEW-EX-003 | 各入力欄と「申請する」ボタンが表示されること | 取るに足らない | 入力や申請の観点を実行すれば必ず触れる |
| RSV-NEW-EX-004 | ダッシュボードの「予約を申請する」ボタンから予約申請フォームを開けること | この画面の対象範囲外 | ダッシュボード側のボタンの振る舞いである |
| RSV-NEW-EX-005 | 無効なリソースのリソース詳細では「このリソースを予約する」ボタンが表示されないこと | この画面の対象範囲外 | リソース詳細側の表示条件である |
| RSV-NEW-EX-006 | 申請後に、ダッシュボードのマイ予約件数が増えること | この画面の対象範囲外 | ダッシュボードの集計表示が主役の振る舞いである |
| RSV-NEW-EX-007 | 申請した予約を承認者が承認または却下できること | この画面の対象範囲外 | 承認待ち一覧が主役の振る舞いである |
| RSV-NEW-EX-008 | 承認者ロールのユーザーが一人もいない状態で承認が必要なリソースを申請すると、申請できないこと | 上流のテストで担保済み | シードデータの設定ミスで起きる状態で、画面を通して作るにはデータの変更が要るため、API のテストで確かめる |
| RSV-NEW-EX-009 | 存在しないリソースを指定して申請すると、申請できないこと | 上流のテストで担保済み | 画面の選択肢から選ぶ限り起きないため、API のテストで確かめる |
| RSV-NEW-EX-010 | タイムゾーンのずれ（オフセット）付きの日時で申請すると、申請できないこと | 上流のテストで担保済み | 画面の日時入力欄からは送れない形式のため、API のテストで確かめる |
| RSV-NEW-EX-011 | 申請後のマイ予約一覧で、ステータスバッジが承認待ちは黄、承認済みは緑で表示されること | 手動確認に隔離 | 色の判断は人の目で確かめる |

## 4. 仕様確認事項

### 4.1 仕様の食い違い（要回答）

| ID | 質問 | 回答の選択肢（案） | 影響する観点 | 見た箇所 | 回答 |
|---|---|---|---|---|---|
| RSV-NEW-Q-001 | ADMIN で開いたとき、リソース選択の選択肢に無効なリソースを含めるか | A. 含めない（画面仕様書の「有効リソース一覧」に合わせる）／B. 含める（要件定義書 RES-02 と API 仕様書の ADMIN の例外に合わせる） | A なら『ADMIN で開くと、リソース選択の選択肢に無効なリソースが含まれないこと』／B なら『ADMIN で開くと、リソース選択の選択肢に無効なリソースも含まれること』 | screen-spec.md「§予約 > `/reservations/new` > UI 要素」と、requirements.md「§リソース > UC-02」RES-02、api-spec.md「§リソース > `GET /api/resources` > クエリパラメータ」の注記。screen-spec.md「§リソース > `/resources` > UI 要素」も ADMIN には無効なリソースを表示すると書く。一方、api-spec.md「§リソース > シーケンス図」の注記 [1] は有効なリソースだけを取る条件で、ADMIN の例外を書いていない |  |

「回答」列は空欄で出力する。学習者がダッシュボードで選んだ回答を、案内スキルが反映するときに書く。

### 4.2 仕様に書かれていない点（回答不要）

ここに挙げた点は、期待結果を仕様から決められないため、観点にしない。

- 開始日時に過去の日時を入れたときに申請できるか（screen-spec.md「`/reservations/new` > バリデーション」、requirements.md「UC-03 > 入力項目」、api-spec.md「`POST /api/reservations`」）
- 予約期間の最短と最長、利用できる時間帯（営業時間など）の制約（同上）
- 日時の入力単位（分単位か、秒まで入れられるか）と、画面で扱うタイムゾーン（screen-spec.md「`/reservations/new` > UI 要素」、api-spec.md「§共通 > 日時フォーマット」は API の形式だけを定める）
- 参加人数の上限と、リソースの定員を超える人数を入れたときの扱い（api-spec.md「`POST /api/reservations`」は「1 以上」だけ、er-diagram.md「reservations」は型だけ）
- 参加人数に小数を入れたときの画面上の扱い（screen-spec.md「`/reservations/new` > UI 要素」は「数値入力欄」とだけ書く）
- 利用目的に空白だけを入れたときの扱いと、使える文字種（screen-spec.md「`/reservations/new` > UI 要素」、api-spec.md「`POST /api/reservations`」は文字数だけ）
- 重複予約以外の入力不備で表示するメッセージの文言と表示位置（screen-spec.md「`/reservations/new` > バリデーション」）
- 申請に成功したときの完了メッセージの有無（screen-spec.md「`/reservations/new` > 申請後フロー」）
- 申請に失敗したあと、入力した値がフォームに残るか（screen-spec.md「`/reservations/new`」）
- 「申請する」ボタンの二重押しの防止と、通信失敗やタイムアウトのときの画面の動き（screen-spec.md「`/reservations/new`」）
- クエリパラメータなしで開いたときの、リソース選択の初期状態（screen-spec.md「`/reservations/new` > UI 要素」の注記）
- 存在しないリソース ID をクエリパラメータに指定して開いたときの扱い（screen-spec.md「`/reservations/new` > UI 要素」の注記、api-spec.md「`GET /api/resources/{id}`」）
- 無効なリソースの ID をクエリパラメータに指定して開いたときの扱いと、無効なリソースへの申請を受け付けるか（screen-spec.md「`/reservations/new` > UI 要素」の注記、api-spec.md「`POST /api/reservations`」のバリデーション）
- 有効なリソースが1ページ分（20件）を超えるとき、リソース選択の選択肢に全件が並ぶか（screen-spec.md「`/reservations/new` > UI 要素」、api-spec.md「§共通 > ページネーション規約」）
- リソース選択の選択肢に出す内容（リソース名だけか、カテゴリや承認の要否も出すか）と並び順（screen-spec.md「`/reservations/new` > UI 要素」）
- マイ予約一覧のステータスバッジに表示する文言（screen-spec.md「`/reservations` > UI 要素」は色だけを定める）

## 5. 集計

| 区分 | 件数 |
|---|---|
| 試験観点 | 38 |
| 確認しない観点 | 11 |
| 仕様の食い違い（要回答） | 1 |
| 仕様に書かれていない点 | 16 |

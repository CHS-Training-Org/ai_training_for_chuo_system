# A1（サインインの方式）技術検証 手順書

未決事項 A1「開発専用のロール別ログインを正式な手順とするのか、別の方式を用意するのか」を実測で確定させる。

決めたいことは 3 つ。

1. サインイン画面のロール別ボタンを Playwright から押して、cookie の発行と画面遷移が成立するか
2. 発行された cookie をテスト間で再利用できるか（毎テストでログインを繰り返さずに済むか）
3. cookie の有効期限（1 時間）がテスト全体の実行時間に耐えるか

---

## 0. ファイルの配置

技術検証はチュートリアル本体に影響させない方針なので、別ブランチで行う。既存の
`playwright.config.ts` には手を入れない。

```
frontend/playwright.a1.config.ts          ← 検証専用の設定
frontend/tests/e2e/a1-preflight.spec.ts   ← 環境の切り分け
frontend/tests/e2e/auth.setup.ts          ← ログインしてセッションを保存
frontend/tests/e2e/a1-signin.spec.ts      ← 保存したセッションの再利用
```

`.gitignore` に次の 1 行を追記する。保存されるセッションファイルには cognito-local が
発行した実物の IdToken が入るため、リポジトリに入れてはいけない。

```gitignore
frontend/playwright/.auth/
```

---

## 1. 前提の準備

順番が重要。この順でないと、後述の「サインイン画面へ戻され続ける」に必ず当たる。

1. devcontainer を起動する（postgres と cognito-local が上がる）
2. `cp frontend/.env.local.example frontend/.env.local`
3. `bash scripts/provision-cognito.sh` を実行し、出力された `COGNITO_USER_POOL_ID` と
   `COGNITO_CLIENT_ID` を `frontend/.env.local` に書く
4. `scripts/seed.sql` を postgres に投入する（手順は[環境構築のステップ 5](../../docs-next/docs/learn/getting-started.md)を参照）
5. `cd backend && ./gradlew bootRun` でバックエンドを起動する
6. Playwright のブラウザを入れる

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
```

4 と 5 を飛ばすと、cookie は発行されるのにレイアウトがサインイン画面へ戻す。
バックエンドがトークンの `sub` で `users` テーブルを引く仕組みのため、初期データが
ないとユーザーが解決できない。この症状は既に[環境構築ガイド](../../docs-next/docs/learn/getting-started.md)と
[トラブルシューティング](../../docs-next/docs/develop/troubleshooting.md)に記録がある。

---

## 2. 実行

```bash
cd frontend
pnpm exec playwright test -c playwright.a1.config.ts
```

`preflight` → `setup` → `a1` の順に直列で走る。前の段が落ちたら後ろは実行されない。

---

## 3. 期待される結果

すべて通った場合、標準出力に次の行が出る（`remainingSec` は実測値）。

```
[A1][preflight] backend health status=200
[A1][setup] MEMBER: httpOnly=true sameSite=Lax secure=false path=/ remainingSec=3599
[A1][setup] APPROVER: ...
[A1][setup] ADMIN: ...
```

そのうえで `frontend/playwright/.auth/` に `member.json` / `approver.json` / `admin.json`
の 3 ファイルができ、`a1` プロジェクトの 2 件が通る。

---

## 4. 落ちたときの切り分け

| 落ちた場所 | 症状 | 原因 |
|---|---|---|
| preflight 1 件目 | ロール別ログインボタンが見えない | `NODE_ENV` が production になっている。設定の `webServer.command` が `pnpm dev` か確認する |
| preflight 2 件目 | backend health が 5xx | バックエンド未起動。`./gradlew bootRun` |
| setup | ダッシュボードの見出しが出ない（サインイン画面に留まる） | 初期データ未投入、または `.env.local` の `COGNITO_CLIENT_ID` が未設定。前提の 3 と 4 |
| setup | `dev-id-token cookie が発行されていない` | Server Action 自体が失敗している。cognito-local への到達を疑う（`COGNITO_LOCAL_ENDPOINT`） |
| setup | `storageState に dev-id-token が保存されていない` | **これが A1 の本命の失敗**。httpOnly cookie が保存対象から落ちている。セッション再利用は不可と結論し、テストごとにログインを通す設計に切り替える |
| a1 | `/auth/signin` へ飛ぶ | 保存はできたが再利用が効いていない。cookie の属性（`sameSite` / `path` / `expires`）を setup の添付ファイルで確認する |

---

## 5. 記録する内容

進行状況ページの未決事項の表に反映するため、次を埋める。

### 決定

- [ ] サインインの方式：開発専用ロール別ログインを正式な手順とする／しない
- [ ] セッションの扱い：保存したセッションを再利用する／テストごとにログインする
- [ ] 根拠：上記の実行結果（通った項目、落ちた項目、`remainingSec` の実測値）

### 同時に固定される制約

この 2 つは A1 の決定に付随して動かせなくなる。決定と一緒に書き残す。

- テスト対象を本番ビルドに切り替えると `NODE_ENV` が production になり、この経路は遮断される
- cognito-local のエンドポイントの既定値は devcontainer のネットワーク内でしか解決しない
  ホスト名である。CI で動かすなら別の解決方法が要る（未決事項 7 に接続する）

### 併せて分かること

- `remainingSec` が 3600 前後なら、1 回の実行の中では有効期限は問題にならない。
  ただし保存したファイルを日をまたいで使い回すと失効する。setup を毎回走らせる
  構成（本設定はそうなっている）ならこの問題は起きない
- バックエンド未起動だと認証済み画面が一切描画されない。予約申請画面のデータ取得が
  サーバー側で行われるため、クライアント側のバリデーションだけを見るテストでも
  バックエンドの起動は省略できない（未決事項 3 に接続する）

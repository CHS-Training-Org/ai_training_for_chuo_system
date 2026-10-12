# E2E Test Instructions（csv-report）

## 判定: 自動 E2E は追加も実行もしない

- **追加しない理由**: 本ユニットの Code Generation 計画は E2E の新規追加をスコープに含めない。既存 E2E の整備は別課題（既存機能の E2E テスト追加）で扱う
- **既存スイートを実行しない理由**: 次の 2 点から、既存スイートが本ユニットの変更で壊れる経路はないと判断した
  - `frontend/tests/e2e/` に `/reservations` ページのヘッダ行（「リソースを探す」リンク）や CSV に関する参照がない（grep で確認）
  - 本ユニットは `/reservations` のヘッダに ADMIN のときだけ要素を足すもので、MEMBER の画面と既存の操作は変えない
- **実行環境の制約**: 既存 E2E は PostgreSQL と cognito-local を起動した状態が前提で、本検証の環境ではそれらのコンテナが稼働していなかったため実行していない。前ユニットで記録された、フルスイートの環境負荷依存タイムアウトの問題もある

## 手動での動作確認手順（未実施。PR 前に学習者が確認する）

ビルドとテストでは、Route Handler とバックエンド API の契約、CSV の中身、ロール別の拒否までを確認済み。ブラウザでの実機確認は次の手順で行う。

1. `docker compose -f .devcontainer/docker-compose.yml up -d` で PostgreSQL と cognito-local を起動し、`cd backend && ./gradlew bootRun`、`cd frontend && pnpm dev` を起動する
2. サインイン画面の「開発専用ロール別ログインボタン」で **ADMIN** としてログインし、`/reservations` を開く
3. ヘッダ行に「CSV ダウンロード」ボタンがあること、ステータスタブや期間フィルタを選ぶと CSV の対象が連動することを確認する
4. ボタンを押して `reservations_yyyyMMdd.csv` が保存されること、**Excel で開いて日本語が文字化けしない**こと、日時が `yyyy-MM-dd HH:mm` で、承認状態が日本語であることを確認する
5. 利用目的に `=1+1` やカンマ・改行を含む予約を作り、CSV で数式が実行されず（先頭に `'`）、列がずれないことを確認する
6. **MEMBER** と **APPROVER** でログインして `/reservations` を開き、ボタンが表示されないこと、`/api/reports/reservations/csv` を直接開くと 403 の JSON が返ることを確認する

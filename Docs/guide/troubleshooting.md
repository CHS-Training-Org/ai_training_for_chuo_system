# トラブルシューティング

> 対象読者：学習者（主に新人）
> 参照：[getting-started.md](./getting-started.md)

環境構築・開発中によくあるトラブルと解決策をまとめています。各項目は「症状 → 原因 → 解決策」の形式で記載します。

---

## DevContainer・Docker 関連

### （Windows）ファイル操作・ビルドが極端に遅い / ホットリロードが効かない

- **症状**: `pnpm install` や Gradle ビルドが異常に遅い。ファイルを保存しても HMR / Spring devtools が再読み込みしない。
- **原因**: リポジトリを Windows 側（`/mnt/c/...`）に置いている。WSL2 からのクロスファイルシステムアクセスが低速で、inotify のファイル変更イベントも正しく伝播しない。
- **解決策**: リポジトリを **WSL2 ネイティブ FS（`/home/<user>/...`）へ clone し直す**。WSL2 ターミナルで `pwd` が `/home/...` を返すことを確認してから VS Code を `code .` で開き、`Reopen in Container` する。詳細は [getting-started.md の「OS 別の注意事項」](./getting-started.md#os-別の注意事項windows-wsl2-を使う) を参照。

### （Windows）「Reopen in Container」時に Wayland ソケットのマウントエラーが出る

- **症状**: WSLg 有効環境で DevContainer 起動時に Wayland ソケット関連のマウントエラーで失敗する。
- **解決策**: VS Code のグローバル設定（`Preferences: Open User Settings (JSON)`）に以下を追加する。
  ```json
  "dev.containers.mountWaylandSocket": false
  ```

---

## 依存インストール関連

<!-- Batch 5 で記述：`pnpm install` 失敗・`./gradlew dependencies` エラー・Node.js / Java バージョン不一致等のトラブルと解決策 -->

---

## 起動・接続エラー

<!-- Batch 5 で記述：フロントエンド（pnpm dev）・バックエンド（./gradlew bootRun）・cognito-local の起動失敗。ポート 3000 / 8080 / 9229 の競合確認方法 -->

---

## DB・マイグレーション関連

<!-- Batch 5 で記述：Flyway マイグレーション失敗（V001 適用エラー・チェックサムエラー）・PostgreSQL 接続拒否等のトラブルと解決策 -->

---

## AI ツール関連

<!-- Batch 5 で記述：GitHub Copilot / Claude Code CLI が DevContainer 内で動かない場合の確認手順 -->

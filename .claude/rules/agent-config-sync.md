# Claude Code 設定台帳の同期

`Docs/claude/agent-config.md` は「このリポジトリの `.claude/` 配下に何がインストールされていて、どう呼び出すか」を学習者・メンターに示す台帳である。台帳が実態とずれると、参照した学習者が存在しないスキルを探したり、変更済みの挙動を古い説明のまま信じたりする。

## 適用対象

次のいずれかを追加・変更・削除するときは、**同じ変更の中で** `Docs/claude/agent-config.md` の該当箇所も更新する。

- `.claude/rules/*.md`（Rules セクション）
- `.claude/skills/*/SKILL.md`（Skills セクションのリポジトリ独自スキル表。frontmatter の `description` や、呼び出し方・役割に影響する本文の変更を含む）
- `.claude/settings.json` の `hooks` / `enabledPlugins` / `statusLine` / `permissions` / `language` / `model` / `advisorModel`（Hooks セクション、公式プラグイン表、その他の設定セクション）

## 更新の仕方

- 新規追加：該当セクションの表に行を追加する
- 削除：該当行を削除する
- 挙動・トリガー文言・役割説明の変更：該当行の説明文を実態に合わせて書き換える
- 更新した場合は frontmatter の `timestamp` を当日の日付に更新する

## 位置づけ

これは AI-DLC エンジン固有のルール（`aidlc-*.md`）ではなく、`.claude/` 配下の設定変更全般に適用される横断的な運用ルールである。強制力はなく、常時ロードされる文脈として更新の判断を促すもの（hooks によるコミット時の機械的検証ではない）。機械的な強制が必要になった場合は、`.claude/settings.json` の `hooks` で担う。

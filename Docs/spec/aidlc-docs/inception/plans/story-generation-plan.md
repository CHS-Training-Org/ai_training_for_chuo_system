# Story Generation Plan — reservation-draft

## 方針

- **Breakdown Approach**: Feature-Based を基本としつつ、アクセス制御（RSV-02）はロール別の視点が不可欠なため Persona-Based の要素を取り入れたハイブリッドとする
- **ペルソナ**: 3ペルソナ（MEMBER：下書きの作成者・編集者、APPROVER：他人の下書きを見てはいけない立場、ADMIN：全件閲覧できる立場）
- **粒度**: 受入条件（requirements.md 記載の6項目）に対応する6ストーリー程度に分解する
- **フォーマット**: 「〜として、〜したい。それによって〜できる」形式 + Gherkin 形式の受入条件（既存ユニットの stories.md と同じ形式を踏襲）

## 実行チェックリスト

- [x] Step A: `personas.md` を生成する（MEMBER・APPROVER・ADMIN の3ペルソナ）
- [x] Step B: `stories.md` を生成する。以下の6ストーリー候補を INVEST 基準で検証しながら作成する
  - 下書き保存（新規作成時に `draft=true` で保存、承認フローに流れない）
  - 下書きの再編集（DRAFTのまま内容を更新）
  - 正式申請（DRAFT→PENDING/APPROVED遷移、承認不要リソースと要承認リソースで結果が異なる）
  - 下書きの削除（既存キャンセル機構の転用）
  - 下書き一覧の表示（下書きタブ、デフォルト「すべて」タブからの除外）
  - 他人の下書きへのアクセス拒否（APPROVER・他MEMBER→403、ADMINは許可、承認一覧にも表示されない）
- [x] Step C: 各ストーリーに受入条件（Gherkin形式）を記載し、requirements.md の受入条件6項目をすべてカバーしていることを確認する

## 確認事項

requirements.md の決定事項（5件）により、ストーリー作成に必要な曖昧点はすべて解消済みと判断する。追加の確認質問はない。

# Story Generation Plan — csv-report

## 方針

- **Breakdown Approach**: Feature-Based を基本とし、アクセス制御（RPT-04）だけはロール別の視点が必要なため Persona-Based の要素を取り入れたハイブリッドとする
- **ペルソナ**: 3 ペルソナ（ADMIN：CSV をダウンロードする、MEMBER：ダウンロード不可、APPROVER：ダウンロード不可）
- **粒度**: 受入条件（requirements.md の 5 項目）に対応する 5 ストーリーに分解する
- **フォーマット**: 「〜として、〜したい。それによって〜できる」形式 + Gherkin 形式の受入条件（既存ユニットの stories.md と同じ形式を踏襲）

## 実行チェックリスト

- [x] Step A: `personas.md` を生成する（ADMIN・MEMBER・APPROVER の 3 ペルソナ）
- [x] Step B: `stories.md` を生成する。以下の 5 ストーリー候補を INVEST 基準で検証しながら作成する
  - US-01 CSV ダウンロード（`/reservations` の ADMIN 用ボタン、現在の絞り込み条件の引き継ぎ、ファイル名）
  - US-02 CSV の内容（日本語ヘッダ・7 列・承認状態の日本語ラベル・UTF-8 BOM・ソート順・0 件時）
  - US-03 期間とステータスでの絞り込み（期間重複判定、`from`/`to` の片方のみは 400、両方なしは全期間、`status` 未指定は DRAFT 除外）
  - US-04 権限のないロールの拒否（MEMBER・APPROVER は 403、未認証は 401、ボタンは ADMIN にだけ表示）
  - US-05 特殊文字と数式の安全な出力（RFC 4180 エスケープ、先頭 `=` `+` `-` `@` の無害化）
- [x] Step C: 各ストーリーに受入条件（Gherkin 形式）を記載し、requirements.md の受入条件 5 項目（ユニットテストの項目は US-02 と US-05 のテスト観点として対応付ける）をすべてカバーしていることを確認する

## 確認事項

requirements.md の決定事項（9 件）と既定の前提により、ストーリー作成に必要な曖昧点はすべて解消済みと判断する。追加の確認質問はない。

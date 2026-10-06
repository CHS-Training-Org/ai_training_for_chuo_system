# Functional Design Plan — ユニット: reservation-list-filter（予約一覧のフィルタ拡張）

Application Design/Units Generation は SKIP 済みのため、`requirements.md`・`stories.md`（INCEPTION 成果物）を直接の入力として使う。

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（resourceName・from/to・status・role の合成方式、16メソッドへの分岐ロジック）
- [x] Step 2: `business-rules.md` を生成する（大文字小文字非依存・ワイルドカードエスケープ・from/to同時指定必須・overlap意味論・既存可視範囲維持）
- [x] Step 3: `domain-entities.md` を生成する（スキーマ変更がないことの確認）
- [x] Step 4: `frontend-components.md` を生成する（`ReservationFilterForm` の新規作成・`reservations/page.tsx`・`server/actions/reservations.ts` の変更点）

## 確認済み事項（Requirements Analysis・User Stories から持ち越し、再確認不要）

- from/to の重複判定 → `checkConflict`/`overlaps` と同じ半開区間 overlap 判定
- resourceName → 大文字小文字非依存の部分一致
- resourceName 空白のみ → 未入力として扱う
- from/to → 同時指定必須（片方のみは400 VALIDATION_ERROR）

## 本ステージで新たに決定する技術非依存の設計判断

- **ワイルドカードエスケープ**: resourceName による LIKE 部分一致は、keyword 検索（Issue #23）と同じ理由（`%`・`_` を含むリソース名でも正しく動作させるため）で `%`・`_` のエスケープを適用する。ビジネス要求シートに明記はないが、同一メカニズム（LOWER+LIKE 部分一致）を使う以上、エスケープなしでは NFR-05 相当の潜在バグになるため、既存実装と一貫させる形で適用する
- **16メソッド構成**: 既存の「role（ADMIN/非ADMIN）× status有無」4メソッドに、resourceName有無・period（from/to）有無を掛け合わせた最大16通りの `@Query` メソッドを `ReservationRepository` に追加する。共通条件（resourceName一致・period重複判定）はインターフェース定数として集約し、JPQL文字列の重複・ズレを防ぐ。既存の4メソッド（`findAllFetch`・`findByStatusInFetch`・`findByRequesterIdFetch`・`findByRequesterIdAndStatusInFetch`）は変更しない

曖昧な点はなし（Requirements Analysis・User Stories で主要な判断は確定済み）のため、本ステージでの追加確認質問はなし。

## 承認

この内容で Functional Design 成果物を生成し、承認を得てから Code Generation へ進む。

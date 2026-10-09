# User Stories Assessment — 予約の下書き保存

**対象**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
**入力**: `Docs/spec/aidlc-docs/inception/requirements/reservation-draft/requirements.md`（FR-01〜FR-07、NFR-01〜NFR-04）
**判定日時**: 2026-10-02T11:02:40+00:00

---

## 要求の分析

- **元の要求**: 予約申請を完了前に `DRAFT` として保存し、後から再編集・正式申請できるようにする
- **利用者への影響**: Direct（3つの画面に新しい操作が加わる）
- **複雑さ**: Medium
- **関係するロール**: MEMBER（申請者本人）、APPROVER、ADMIN

---

## 該当する判定基準

### High Priority（常に実行）

- **New User Features**: 「下書き保存」ボタン、下書きタブ、正式申請ボタンという利用者が直接操作する機能が増える
- **User Experience Changes**: 予約申請の流れに「一度取り置いて後で申請する」という分岐が加わり、既存の操作の流れが変わる
- **Multi-Persona Systems**: 3ロールで振る舞いが異なる。とくに APPROVER は、既存の権限モデルでは全予約を閲覧できるのに対し、`DRAFT` だけは閲覧できなくなる
- **Complex Business Logic**: ステータス遷移の可否、承認ステップ生成の条件分岐、重複予約チェックの実行タイミングという3つのルールが絡む

### Benefits（ストーリー化で得られるもの）

- 要求シートの受入条件が述べていない境界的な振る舞い（下書き保存時に重複チェックを行わないこと、正式申請の時点で競合が判明しうること）を、テスト可能な形に落とせる
- APPROVER の可視範囲が既存の権限モデルから変わる点を、独立したストーリーとして明示できる
- 受入条件からの意図的な逸脱（要件定義 §7、正式申請後のステータス）を、受入基準の形で残せる

---

## 判定

**User Stories を実行する**: Yes

**理由**: High Priority の4基準すべてに該当する。
とくに、APPROVER の可視範囲が既存の権限モデルと逆向きに変わる点と、
正式申請後のステータスが `requires_approval` に依存する点は、
要件の散文のままでは実装時とセルフレビュー時に取りこぼしやすい。
Given/When/Then の受入基準に落とすことで、そのままテストケースの設計に使える。

---

## 期待する成果

- 受入基準がバックエンドのテストケースに1対1で対応し、`ReservationServiceTest` と `ReservationControllerTest` の追加分の設計根拠になる
- ロールごとの振る舞いの差が独立したストーリーになり、権限まわりの実装漏れを検出できる
- 要求シートの受入条件6項目と、要件定義の FR-01〜FR-07 の双方が、いずれかのストーリーで被覆されることを確認できる

# Integration Test Execution — `reservation-draft`

**作成日時**: 2026-10-02

結合テストは `ReservationControllerTest` が担う。
Spring の MockMvc で HTTP 層からサービス層まで通し、H2 インメモリ DB に対して実行する。
テストデータは `JdbcTemplate` で直接挿入し、各テストの後に削除する。

```bash
cd backend
./gradlew test --tests "*ReservationControllerTest"
```

## 本ユニットで追加したテストデータ

| ID の末尾 | 内容 |
|---|---|
| `...0023` | MEMBER が所有する `DRAFT` 予約（承認要リソース・2025-06-13 10:00-12:00） |
| `...0024` | OTHER_MEMBER が所有する `DRAFT` 予約（承認不要リソース・2025-06-14 10:00-12:00） |

## 追加したテスト（10件）

| テスト | 検証内容 |
|---|---|
| `create_draftFlag_returns201Draft` | `draft=true` で承認要リソースでも `DRAFT` になり、`approval_steps` が0件 |
| `get_ownDraft_returns200` | 申請者本人は自分の下書きを閲覧できる |
| `get_otherMemberDraft_returns403` | 他の MEMBER は 403 |
| `get_approverAccessOtherDraft_returns403` | APPROVER も 403 |
| `get_approverAccessOtherPending_returns200` | `DRAFT` 以外の可視範囲は変わらない（非回帰） |
| `get_adminAccessOtherDraft_returns200` | ADMIN は閲覧できる |
| `update_draftContentByOwner_staysDraft` | 内容更新でステータスは変わらない |
| `update_submitDraftWithApprovalRequired_returns200Pending` | 正式申請で `PENDING` になり `approval_steps` が1件生成される |
| `update_submitNonDraftReservation_returns422` | `DRAFT` 以外への `status` 指定は 422 |
| `update_submitWithStatusOtherThanPending_returns422` | `PENDING` 以外の値は 422 |
| `update_otherMemberDraftByAdmin_returns403` | ADMIN は閲覧できても更新できない |

## 承認フローとの結合

承認待ち一覧（`GET /api/approvals/pending`）は `approval_steps` のみを参照する。
`DRAFT` では承認ステップを生成しないため、承認側のコードを変更しなくても下書きは承認一覧に現れない。
この点は `create_draftFlag_returns201Draft` が `approval_steps` の件数を直接数えることで担保している。

/**
 * 予約の操作可否判定（canEditReservation / canSubmitDraft）の単体テスト。
 *
 * 画面コンポーネントのレンダリングテストは行わず、判定ロジックを純関数として検証する
 * （resource-filter-href.test.ts と同じ方針）。
 */
import { describe, it, expect } from "vitest";
import { canEditReservation, canSubmitDraft } from "@/lib/reservation-permissions";

const owner = { isOwner: true, isAdmin: false };
const otherMember = { isOwner: false, isAdmin: false };
const admin = { isOwner: false, isAdmin: true };

describe("canEditReservation", () => {
  it("申請者本人の DRAFT は編集できる", () => {
    expect(canEditReservation("DRAFT", owner)).toBe(true);
  });

  it("申請者本人の PENDING は編集できる", () => {
    expect(canEditReservation("PENDING", owner)).toBe(true);
  });

  it.each(["APPROVED", "REJECTED", "CANCELLED"])("%s は編集できない", (status) => {
    expect(canEditReservation(status, owner)).toBe(false);
  });

  it("他人の予約は編集できない", () => {
    expect(canEditReservation("DRAFT", otherMember)).toBe(false);
    expect(canEditReservation("PENDING", otherMember)).toBe(false);
  });

  it("ADMIN は閲覧できる DRAFT でも編集できない（PUT の権限を持たないため）", () => {
    expect(canEditReservation("DRAFT", admin)).toBe(false);
    expect(canEditReservation("PENDING", admin)).toBe(false);
  });
});

describe("canSubmitDraft", () => {
  it("申請者本人の DRAFT は正式申請できる", () => {
    expect(canSubmitDraft("DRAFT", owner)).toBe(true);
  });

  it.each(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])("%s は正式申請の対象外", (status) => {
    expect(canSubmitDraft(status, owner)).toBe(false);
  });

  it("他人の下書きは正式申請できない", () => {
    expect(canSubmitDraft("DRAFT", otherMember)).toBe(false);
  });

  it("ADMIN は他人の下書きを代理で正式申請できない", () => {
    expect(canSubmitDraft("DRAFT", admin)).toBe(false);
  });
});

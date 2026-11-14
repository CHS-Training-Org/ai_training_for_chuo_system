/**
 * reservation-permissions.ts のユニットテスト。
 *
 * 予約の状態、本人かどうか、ADMIN かどうかの組み合わせで、ボタンの出し分けが
 * 設計の「画面の表示ルール」どおりになることを確認する。
 */
import { describe, it, expect } from "vitest";
import { getReservationActions } from "@/lib/reservation-permissions";

const NONE = { canEdit: false, canSubmit: false, canDelete: false, canCancel: false };

describe("getReservationActions", () => {
  describe("下書き（DRAFT）", () => {
    it("本人（MEMBER / APPROVER）は、編集・正式申請・削除ができ、キャンセルはできない", () => {
      expect(getReservationActions({ status: "DRAFT", isOwner: true, isAdmin: false })).toEqual({
        canEdit: true,
        canSubmit: true,
        canDelete: true,
        canCancel: false,
      });
    });

    it("ADMIN も、自分の下書きなら編集・正式申請・削除ができる（キャンセルはできない）", () => {
      expect(getReservationActions({ status: "DRAFT", isOwner: true, isAdmin: true })).toEqual({
        canEdit: true,
        canSubmit: true,
        canDelete: true,
        canCancel: false,
      });
    });

    it("他人の下書きは、ADMIN も何もできない（閲覧のみ）", () => {
      expect(getReservationActions({ status: "DRAFT", isOwner: false, isAdmin: true })).toEqual(
        NONE,
      );
    });

    it("他人の下書きは、MEMBER / APPROVER も何もできない", () => {
      expect(getReservationActions({ status: "DRAFT", isOwner: false, isAdmin: false })).toEqual(
        NONE,
      );
    });
  });

  describe("承認待ち（PENDING）", () => {
    it("ADMIN を除く本人は、編集とキャンセルができる（正式申請・削除は対象外）", () => {
      expect(getReservationActions({ status: "PENDING", isOwner: true, isAdmin: false })).toEqual({
        canEdit: true,
        canSubmit: false,
        canDelete: false,
        canCancel: true,
      });
    });

    it("ADMIN は、自分の承認待ちでも編集できない（従来の仕様）。キャンセルはできる", () => {
      expect(getReservationActions({ status: "PENDING", isOwner: true, isAdmin: true })).toEqual({
        canEdit: false,
        canSubmit: false,
        canDelete: false,
        canCancel: true,
      });
    });

    it("他人の承認待ちは、ADMIN だけがキャンセルできる", () => {
      expect(getReservationActions({ status: "PENDING", isOwner: false, isAdmin: true })).toEqual({
        canEdit: false,
        canSubmit: false,
        canDelete: false,
        canCancel: true,
      });
      expect(getReservationActions({ status: "PENDING", isOwner: false, isAdmin: false })).toEqual(
        NONE,
      );
    });
  });

  describe("承認済み（APPROVED）", () => {
    it("本人と ADMIN はキャンセルできる。編集・正式申請・削除はできない", () => {
      const cancelOnly = { ...NONE, canCancel: true };
      expect(getReservationActions({ status: "APPROVED", isOwner: true, isAdmin: false })).toEqual(
        cancelOnly,
      );
      expect(getReservationActions({ status: "APPROVED", isOwner: false, isAdmin: true })).toEqual(
        cancelOnly,
      );
    });

    it("他人の MEMBER / APPROVER は何もできない", () => {
      expect(getReservationActions({ status: "APPROVED", isOwner: false, isAdmin: false })).toEqual(
        NONE,
      );
    });
  });

  describe.each(["REJECTED", "CANCELLED"])("%s", (status) => {
    it("本人・ADMIN のどの組み合わせでも、何もできない", () => {
      for (const isOwner of [true, false]) {
        for (const isAdmin of [true, false]) {
          expect(getReservationActions({ status, isOwner, isAdmin })).toEqual(NONE);
        }
      }
    });
  });
});

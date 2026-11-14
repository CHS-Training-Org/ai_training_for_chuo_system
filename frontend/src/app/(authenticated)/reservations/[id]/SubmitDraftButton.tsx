"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tryUpdateReservationAction } from "@/server/actions/reservations";
import { Button } from "@/components/ui/button";

interface SubmitDraftButtonProps {
  reservationId: string;
  /** 下書きの現在の値。更新 API が必須項目を要求するため、そのまま送る。 */
  startAt: string;
  endAt: string;
  purpose: string;
  attendeesCount: number | null;
}

/**
 * 下書きの正式申請ボタン（screen-spec.md §予約詳細 /reservations/{id} 準拠）。
 *
 * `PUT /api/reservations/{id}`（`draft` は指定しない）で正式申請する。
 * 承認が必要なリソースは承認待ち（PENDING）、不要なリソースは承認済み（APPROVED）になる。
 * 時間帯が重複していれば 409 Conflict → エラーメッセージをボタンの近くに表示し、下書きのまま残る。
 */
export function SubmitDraftButton({
  reservationId,
  startAt,
  endAt,
  purpose,
  attendeesCount,
}: SubmitDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleSubmit = () => {
    setConflictError(null);
    startTransition(async () => {
      // 編集画面の初期値と同じく、日時は先頭 16 文字（YYYY-MM-DDTHH:mm）にそろえて送る
      const result = await tryUpdateReservationAction(reservationId, {
        startAt: startAt.slice(0, 16),
        endAt: endAt.slice(0, 16),
        purpose,
        attendeesCount,
      });
      if (result.ok) {
        router.refresh();
      } else {
        setConflictError(
          "指定した時間帯は既に予約が入っています。別の時間帯に変更してから申請してください。",
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        data-testid="reservation-detail-submit-draft-button"
      >
        {isPending ? "申請中..." : "この下書きを正式に申請する"}
      </Button>
      {conflictError && (
        <p
          className="text-sm font-medium text-destructive"
          data-testid="reservation-detail-submit-draft-error"
        >
          {conflictError}
        </p>
      )}
    </div>
  );
}

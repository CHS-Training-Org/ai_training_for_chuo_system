"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReservationAction } from "@/server/actions/reservations";
import { ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface SubmitDraftButtonProps {
  reservationId: string;
  /** 保存済みの下書き内容（詳細ページが持つ値）。この内容で正式申請する。 */
  values: {
    startAt: string;
    endAt: string;
    purpose: string;
    attendeesCount: number | null;
  };
}

/**
 * 下書きの正式申請ボタン（screen-spec.md §予約詳細）。
 *
 * 成功時は同画面を再読込し、ステータスが PENDING / APPROVED に変わる。
 * 失敗（409 重複・422 承認者不在）時は予約は DRAFT のまま残り、メッセージを表示する。
 */
export function SubmitDraftButton({ reservationId, values }: SubmitDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await submitReservationAction(reservationId, values);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "RESERVATION_CONFLICT") {
          setError("指定した時間帯は既に予約が入っています");
        } else if (err instanceof ApiClientError && err.code === "APPROVER_NOT_AVAILABLE") {
          setError("承認者が存在しないため正式申請できません。管理者に連絡してください。");
        } else {
          throw err;
        }
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        data-testid="reservation-detail-submit-button"
      >
        {isPending ? "申請中..." : "正式申請"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

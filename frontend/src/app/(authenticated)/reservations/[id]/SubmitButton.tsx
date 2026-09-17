"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateReservationAction } from "@/server/actions/reservations";
import { ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SubmitButtonProps {
  reservationId: string;
  currentValues: {
    startAt: string;
    endAt: string;
    purpose: string;
    attendeesCount: number | null;
  };
}

/**
 * 下書きの正式申請ボタン（screen-spec.md §予約詳細 準拠）。
 *
 * 保存済みの下書きの内容をそのまま `submit: true` で送信する（新規入力は求めない）。
 * `requires_approval` に応じて `APPROVED` または `PENDING` へ遷移する。
 */
export function SubmitButton({ reservationId, currentValues }: SubmitButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleSubmit = () => {
    setConflictError(null);
    startTransition(async () => {
      try {
        await updateReservationAction(reservationId, { ...currentValues, submit: true });
        setOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "RESERVATION_CONFLICT") {
          setConflictError(
            "下書き保存中に指定した時間帯の予約が埋まりました。内容を確認し再編集してください。",
          );
        } else {
          throw err;
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="reservation-detail-submit-button">正式申請する</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>下書きの正式申請確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この下書きの内容で正式申請します。よろしいですか？
        </p>
        {conflictError && <p className="text-sm font-medium text-destructive">{conflictError}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            戻る
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="reservation-detail-submit-confirm-button">
            {isPending ? "申請中..." : "正式申請する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

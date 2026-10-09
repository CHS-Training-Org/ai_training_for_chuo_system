"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateReservationAction } from "@/server/actions/reservations";
import type { UpdateReservationInput } from "@/lib/schemas/reservation";
import { ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * 下書きの正式申請ボタン（screen-spec.md §予約詳細 準拠）。
 *
 * PUT /api/reservations/{id} は全項目を必須とするため、詳細画面が表示している現在値を props で受け取って送る。
 * 下書き保存の時点では重複予約チェックが行われないため、ここで初めて 409 が返りうる。
 * 捕捉せずに投げるとエラー画面に飛んでしまい、利用者が次に何をすればよいか分からなくなるため、
 * ダイアログ内にメッセージを表示する。あわせて編集画面への導線を出す。
 * 日時を変えない限り再試行しても同じ 409 になり、ダイアログ内で手詰まりになるため。
 */
export function SubmitDraftButton({
  reservationId,
  values,
}: {
  reservationId: string;
  values: UpdateReservationInput;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setConflictError(null);
    startTransition(async () => {
      try {
        await updateReservationAction(reservationId, values, "PENDING");
        setOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "RESERVATION_CONFLICT") {
          setConflictError(
            "指定した時間帯は既に予約が入っています。日時を変更してから再度申請してください。",
          );
        } else {
          throw err;
        }
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConflictError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="reservation-detail-submit-draft-button">正式に申請する</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>正式申請の確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この下書きを正式に申請します。よろしいですか？
          承認が必要なリソースの場合、承認者に承認依頼が渡ります。
        </p>
        {conflictError && <p className="text-sm font-medium text-destructive">{conflictError}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            戻る
          </Button>
          {conflictError ? (
            <Button asChild>
              <Link href={`/reservations/${reservationId}/edit`}>日時を変更する</Link>
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "申請中..." : "申請する"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

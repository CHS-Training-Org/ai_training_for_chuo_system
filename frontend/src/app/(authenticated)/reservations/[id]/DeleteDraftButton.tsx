"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteReservationAction } from "@/server/actions/reservations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * 下書きの削除ボタン（screen-spec.md §予約詳細 準拠）。
 *
 * 削除は取り消せないため、`CancelButton` と同じく確認ダイアログを挟む。
 * 削除後は対象の予約詳細が存在しなくなるため、予約一覧へ遷移する。
 */
export function DeleteDraftButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteReservationAction(reservationId);
      setOpen(false);
      router.push("/reservations");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" data-testid="reservation-detail-delete-draft-button">
          下書きを削除する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>下書きの削除確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この下書きを削除します。よろしいですか？この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            戻る
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "削除中..." : "削除する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
 * 下書きの削除ボタン（screen-spec.md §予約詳細 /reservations/{id} 準拠）。
 *
 * 削除は物理削除で元に戻せないため、`CancelButton` と同じく確認ダイアログを出す。
 * 削除に成功したら、マイ予約一覧（/reservations）へ遷移する。
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
          この下書きを削除する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>下書きの削除確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この下書きを削除します。よろしいですか？削除した下書きは元に戻せません。
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            data-testid="reservation-delete-dialog-cancel-button"
          >
            戻る
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            data-testid="reservation-delete-dialog-confirm-button"
          >
            {isPending ? "削除中..." : "削除する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

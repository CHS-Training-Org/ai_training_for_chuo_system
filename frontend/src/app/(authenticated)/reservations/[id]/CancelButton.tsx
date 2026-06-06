'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelReservationAction } from '@/server/actions/reservations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function CancelButton({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      await cancelReservationAction(reservationId)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">予約をキャンセルする</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予約のキャンセル確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この予約をキャンセルします。よろしいですか？この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            戻る
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? 'キャンセル中...' : 'キャンセルする'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

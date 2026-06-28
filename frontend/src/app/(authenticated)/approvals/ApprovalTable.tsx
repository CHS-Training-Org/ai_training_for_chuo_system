"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveAction, rejectAction } from "@/server/actions/approvals";
import type { ApprovalStepResponse } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/** 日時文字列（ISO）を日本語表示用にフォーマットする。 */
function formatDateTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

// ---------------------------------------------------------------------------
// 承認ダイアログ（コメント任意）
// ---------------------------------------------------------------------------

function ApproveDialog({ step }: { step: ApprovalStepResponse }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await approveAction(step.id, comment || undefined);
        setOpen(false);
        toast.success("承認しました。");
        router.refresh();
      } catch {
        toast.error("承認に失敗しました。");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          承認
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>承認の確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          「{step.resourceName}」の予約申請（{step.requesterName}）を承認します。
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">コメント（任意）</label>
          <Textarea
            placeholder="承認コメントを入力してください（省略可）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleApprove} disabled={isPending}>
            {isPending ? "承認中..." : "承認する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 却下ダイアログ（コメント必須）
// ---------------------------------------------------------------------------

function RejectDialog({ step }: { step: ApprovalStepResponse }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReject = () => {
    // コメント必須バリデーション（UI 側）
    if (!comment.trim()) {
      setCommentError("却下理由を入力してください");
      return;
    }
    setCommentError(null);

    startTransition(async () => {
      try {
        await rejectAction(step.id, comment);
        setOpen(false);
        toast.success("却下しました。");
        router.refresh();
      } catch {
        toast.error("却下に失敗しました。");
      }
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setComment("");
      setCommentError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          却下
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>却下の確認</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          「{step.resourceName}」の予約申請（{step.requesterName}）を却下します。
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            却下理由 <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="却下理由を入力してください（必須）"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (e.target.value.trim()) setCommentError(null);
            }}
            rows={3}
          />
          {commentError && <p className="text-sm font-medium text-destructive">{commentError}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isPending}>
            {isPending ? "却下中..." : "却下する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 承認待ちテーブル
// ---------------------------------------------------------------------------

export function ApprovalTable({ steps }: { steps: ApprovalStepResponse[] }) {
  if (steps.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        現在、承認待ちの申請はありません。
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>リソース名</TableHead>
            <TableHead>申請者</TableHead>
            <TableHead>利用開始</TableHead>
            <TableHead>利用終了</TableHead>
            <TableHead>利用目的</TableHead>
            <TableHead>申請日時</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step) => (
            <TableRow key={step.id}>
              <TableCell className="font-medium">{step.resourceName}</TableCell>
              <TableCell>{step.requesterName}</TableCell>
              <TableCell>{formatDateTime(step.startAt)}</TableCell>
              <TableCell>{formatDateTime(step.endAt)}</TableCell>
              <TableCell className="max-w-48 truncate">{step.purpose}</TableCell>
              <TableCell>{formatDateTime(step.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <ApproveDialog step={step} />
                  <RejectDialog step={step} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

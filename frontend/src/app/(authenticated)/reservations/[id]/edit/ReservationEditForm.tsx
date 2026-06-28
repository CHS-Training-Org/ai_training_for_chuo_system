"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UpdateReservationSchema } from "@/lib/schemas/reservation";
import { updateReservationAction } from "@/server/actions/reservations";
import { ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// cross-field バリデーション（終了日時 > 開始日時）をクライアント側で追加する
const FormSchema = UpdateReservationSchema.refine(
  (data) => !data.startAt || !data.endAt || data.endAt > data.startAt,
  { message: "終了日時は開始日時より後に設定してください", path: ["endAt"] },
);

type FormValues = z.infer<typeof FormSchema>;

/**
 * ISO 文字列（"2025-06-10T10:00:00"）を datetime-local 入力フォーマット（"2025-06-10T10:00"）に変換する。
 */
function toDatetimeLocal(isoString: string): string {
  return isoString.slice(0, 16);
}

interface ReservationEditFormProps {
  reservationId: string;
  defaultValues: {
    startAt: string;
    endAt: string;
    purpose: string;
    attendeesCount: number | null;
  };
  /** 読み取り専用表示するリソース名（リソースの変更は不可: api-spec.md L654） */
  resourceName: string;
}

/**
 * 予約編集フォーム（screen-spec.md §予約編集 /reservations/{id}/edit 準拠）。
 *
 * - リソースは変更不可。現在のリソース名を読み取り専用で表示する。
 * - 対象は PENDING の予約のみ。PENDING 以外は BE が 422 で弾く。
 * - 重複時は 409 Conflict → エラーメッセージを表示する。
 * - 更新成功後は予約詳細（/reservations/{id}）へリダイレクトする。
 */
export function ReservationEditForm({
  reservationId,
  defaultValues,
  resourceName,
}: ReservationEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      startAt: toDatetimeLocal(defaultValues.startAt),
      endAt: toDatetimeLocal(defaultValues.endAt),
      purpose: defaultValues.purpose,
      attendeesCount: defaultValues.attendeesCount,
    },
  });

  const handleSubmit = (values: FormValues) => {
    setConflictError(null);
    startTransition(async () => {
      try {
        await updateReservationAction(reservationId, values);
        router.push(`/reservations/${reservationId}`);
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "RESERVATION_CONFLICT") {
          setConflictError(
            "指定した時間帯は既に予約が入っています。別の時間帯を選択してください。",
          );
        } else {
          throw err;
        }
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* リソース（読み取り専用） */}
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">リソース</p>
          <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/50">
            {resourceName}
            <span className="ml-2 text-xs text-muted-foreground">（変更不可）</span>
          </p>
        </div>

        {/* 開始日時 */}
        <FormField
          control={form.control}
          name="startAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>開始日時 *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 終了日時 */}
        <FormField
          control={form.control}
          name="endAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>終了日時 *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 利用目的 */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>利用目的 *</FormLabel>
              <FormControl>
                <Textarea placeholder="週次ミーティング、プロジェクト打合せ など" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 参加人数 */}
        <FormField
          control={form.control}
          name="attendeesCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>参加人数</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="例: 10"
                  min={1}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 重複エラー表示 */}
        {conflictError && <p className="text-sm font-medium text-destructive">{conflictError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "更新中..." : "更新する"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/reservations/${reservationId}`)}
            disabled={isPending}
          >
            戻る
          </Button>
        </div>
      </form>
    </Form>
  );
}

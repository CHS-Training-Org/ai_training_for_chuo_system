"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CreateReservationFormSchema,
  type CreateReservationFormValues,
} from "@/lib/schemas/reservation";
import { createReservationAction } from "@/server/actions/reservations";
import type { ResourceResponse } from "@/lib/types/api";
import { ApiClientError } from "@/lib/api-client";
import { RECURRENCE_TYPE_LABELS } from "@/lib/labels";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// cross-field バリデーション（終了日時 > 開始日時、繰り返し終了日の必須・範囲）は
// CreateReservationFormSchema（lib/schemas/reservation.ts）に定義している。
type FormValues = CreateReservationFormValues;

export function ReservationForm({
  resources,
  defaultResourceId,
  defaultStartAt,
}: {
  resources: ResourceResponse[];
  defaultResourceId?: string;
  defaultStartAt?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateReservationFormSchema),
    defaultValues: {
      resourceId: defaultResourceId ?? "",
      startAt: defaultStartAt ?? "",
      endAt: "",
      purpose: "",
      attendeesCount: null,
      recurrenceType: "NONE",
      recurrenceUntil: "",
    },
  });

  // 「毎週」「毎月」のときだけ、繰り返し終了日の入力欄を出す
  const recurrenceType = form.watch("recurrenceType");
  const isRecurring = !!recurrenceType && recurrenceType !== "NONE";

  const submitForm = (draft: boolean) => (values: FormValues) => {
    setConflictError(null);
    startTransition(async () => {
      try {
        // 「繰り返さない」では終了日を送らない（API は NONE で終了日があると 400 にするため）
        const { recurrenceUntil, ...rest } = values;
        const created = await createReservationAction({
          ...rest,
          ...(isRecurring ? { recurrenceUntil } : {}),
          draft,
        });
        toast.success(`${created.length} 件の予約を登録しました`);
        router.push(draft ? "/reservations?status=DRAFT" : "/reservations");
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
      <form onSubmit={form.handleSubmit(submitForm(false))} className="space-y-4">
        {/* リソース選択 */}
        <FormField
          control={form.control}
          name="resourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>リソース *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="リソースを選択してください" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.requiresApproval ? "（要承認）" : "（即時確定）"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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

        {/* 繰り返し */}
        <FormField
          control={form.control}
          name="recurrenceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>繰り返し</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="reservation-form-recurrence-type">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(RECURRENCE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 繰り返し終了日（毎週・毎月のときだけ表示） */}
        {isRecurring && (
          <FormField
            control={form.control}
            name="recurrenceUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>繰り返し終了日 *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    data-testid="reservation-form-recurrence-until"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
          <Button type="submit" disabled={isPending} data-testid="reservation-form-submit-button">
            {isPending ? "申請中..." : "予約を申請する"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={form.handleSubmit(submitForm(true))}
            data-testid="reservation-form-draft-button"
          >
            {isPending ? "保存中..." : "下書き保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}

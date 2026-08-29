"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateReservationSchema } from "@/lib/schemas/reservation";
import { createReservationAction } from "@/server/actions/reservations";
import type { ResourceResponse } from "@/lib/types/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// cross-field バリデーション（終了日時 > 開始日時）はクライアント側で追加する
// （'use server' ファイルでは .refine のクロージャを export できないため）
const FormSchema = CreateReservationSchema.refine(
  (data) => !data.startAt || !data.endAt || data.endAt > data.startAt,
  { message: "終了日時は開始日時より後に設定してください", path: ["endAt"] },
);

type FormValues = z.infer<typeof FormSchema>;

export function ReservationForm({
  resources,
  defaultResourceId,
}: {
  resources: ResourceResponse[];
  defaultResourceId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      resourceId: defaultResourceId ?? "",
      startAt: "",
      endAt: "",
      purpose: "",
      attendeesCount: null,
    },
  });

  const handleSubmit = (values: FormValues) => {
    setConflictError(null);
    startTransition(async () => {
      try {
        await createReservationAction(values);
        router.push("/reservations");
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
            {isPending ? "申請中..." : "予約を申請する"}
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

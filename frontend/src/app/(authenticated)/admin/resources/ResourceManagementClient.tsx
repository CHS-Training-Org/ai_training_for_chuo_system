"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createResourceAction,
  updateResourceAction,
  changeResourceStatusAction,
} from "@/server/actions/resources";
import { CreateResourceSchema } from "@/lib/schemas/resource";
import type { ResourceResponse } from "@/lib/types/api";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// フォームスキーマ（CreateResourceSchema をそのまま使用）
// ---------------------------------------------------------------------------

type ResourceFormValues = z.infer<typeof CreateResourceSchema>;

// ---------------------------------------------------------------------------
// リソースフォーム（新規登録・編集共通）
// ---------------------------------------------------------------------------

function ResourceForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<ResourceFormValues>;
  onSubmit: (values: ResourceFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(CreateResourceSchema),
    defaultValues: {
      name: "",
      category: "ROOM",
      capacity: null,
      location: null,
      requiresApproval: false,
      isActive: true,
      description: null,
      ...defaultValues,
    },
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (values: ResourceFormValues) => {
    startTransition(async () => {
      await onSubmit(values);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* リソース名 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>リソース名 *</FormLabel>
              <FormControl>
                <Input placeholder="第1会議室" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* カテゴリ */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ROOM">{RESOURCE_CATEGORY_LABELS.ROOM}</SelectItem>
                  <SelectItem value="EQUIPMENT">{RESOURCE_CATEGORY_LABELS.EQUIPMENT}</SelectItem>
                  <SelectItem value="VEHICLE">{RESOURCE_CATEGORY_LABELS.VEHICLE}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 定員 */}
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>定員</FormLabel>
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

        {/* 場所 */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>場所</FormLabel>
              <FormControl>
                <Input
                  placeholder="例: 3F"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 説明 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="リソースの説明を入力..."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 承認フロー要否 */}
        <FormField
          control={form.control}
          name="requiresApproval"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4"
                />
              </FormControl>
              <FormLabel className="cursor-pointer font-normal">承認フローが必要</FormLabel>
            </FormItem>
          )}
        />

        {/* 有効フラグ */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4"
                />
              </FormControl>
              <FormLabel className="cursor-pointer font-normal">有効</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "処理中..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// メインクライアントコンポーネント
// ---------------------------------------------------------------------------

export function ResourceManagementClient({
  resources: initialResources,
}: {
  resources: ResourceResponse[];
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<ResourceResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  // 新規登録
  const handleCreate = async (values: ResourceFormValues) => {
    await createResourceAction(values);
    setCreateOpen(false);
    refresh();
  };

  // 編集
  const handleEdit = (resource: ResourceResponse) => {
    setEditTarget(resource);
    setEditOpen(true);
  };

  const handleUpdate = async (values: ResourceFormValues) => {
    if (!editTarget) return;
    await updateResourceAction(editTarget.id, values);
    setEditOpen(false);
    setEditTarget(null);
    refresh();
  };

  // 有効/無効切替
  const handleToggleActive = (resource: ResourceResponse) => {
    startTransition(async () => {
      await changeResourceStatusAction(resource.id, !resource.isActive);
      refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* 新規登録ダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button>新規登録</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>リソース新規登録</DialogTitle>
          </DialogHeader>
          <ResourceForm onSubmit={handleCreate} submitLabel="登録する" />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>リソース編集</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ResourceForm
              defaultValues={{
                name: editTarget.name,
                category: editTarget.category as "ROOM" | "EQUIPMENT" | "VEHICLE",
                capacity: editTarget.capacity,
                location: editTarget.location,
                requiresApproval: editTarget.requiresApproval,
                isActive: editTarget.isActive,
                description: editTarget.description,
              }}
              onSubmit={handleUpdate}
              submitLabel="保存する"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* リソース一覧テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>場所</TableHead>
            <TableHead>定員</TableHead>
            <TableHead>承認</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialResources.map((resource) => (
            <TableRow key={resource.id} className={!resource.isActive ? "opacity-50" : ""}>
              <TableCell className="font-medium">{resource.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{resource.category}</Badge>
              </TableCell>
              <TableCell>{resource.location ?? "—"}</TableCell>
              <TableCell>{resource.capacity ?? "—"}</TableCell>
              <TableCell>{resource.requiresApproval ? "要" : "不要"}</TableCell>
              <TableCell>
                {resource.isActive ? (
                  <Badge className="bg-green-100 text-green-700">有効</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    無効
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(resource)}>
                    編集
                  </Button>
                  <Button
                    variant={resource.isActive ? "destructive" : "outline"}
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleActive(resource)}
                  >
                    {resource.isActive ? "無効化" : "有効化"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {initialResources.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                リソースがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

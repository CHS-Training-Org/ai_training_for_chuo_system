/**
 * UI 表示ラベル定数（requirements.md §用語定義 / screen-spec.md 準拠）。
 *
 * 各コンポーネントで散在するラベル文字列をここに一元管理し、用語の不統一を防ぐ。
 * 表示ラベルのみを管理する（enum 値・API パラメータはここで変更しない）。
 */

/** ユーザーロールの表示名（requirements.md L59-61 準拠） */
export const ROLE_LABELS: Record<string, string> = {
  MEMBER: "一般社員",
  APPROVER: "承認者",
  ADMIN: "管理者",
};

/**
 * 予約ステータスの表示名（screen-spec.md §マイ予約 L224 準拠）。
 *
 * - APPROVED = "承認済み"（ダッシュボード・一覧・詳細で統一）
 * - CANCELLED = "キャンセル済み"（screen-spec L224 の表記に準拠）
 */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ドラフト",
  PENDING: "承認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下",
  CANCELLED: "キャンセル済み",
};

/**
 * リソースカテゴリの表示名（requirements.md §カテゴリ定義 / screen-spec.md §リソース 準拠）。
 *
 * 画面表示（Badge・選択UI）で使用する純日本語ラベル。
 * DB 値・API パラメータ・Zod enum は英語（ROOM / EQUIPMENT / VEHICLE）のまま維持する。
 */
export const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  ROOM: "会議室",
  EQUIPMENT: "備品",
  VEHICLE: "社用車",
};

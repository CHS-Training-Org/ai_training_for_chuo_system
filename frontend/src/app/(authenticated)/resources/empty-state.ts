/**
 * リソース一覧が 0 件のときに表示するメッセージを決定する。
 *
 * keyword 指定時（from/to の有無に関わらず）を最優先し、次に from/to 指定時、
 * いずれも未指定時は既定文言を返す（screen-spec.md §`/resources` 準拠）。
 *
 * page.tsx から分離しているのは、page.tsx が getProfileAction 等の
 * サーバー専用モジュールを import しており、ユニットテストから直接 import すると
 * Better Auth の初期化が副作用として走ってしまうため（純関数のみを安全にテストするため）。
 */
export function resolveEmptyResourceMessage(params: {
  keyword?: string;
  from?: string;
  to?: string;
}): string {
  const hasKeyword = Boolean(params.keyword?.trim());
  const hasTimeFilter = Boolean(params.from && params.to);
  if (hasKeyword) {
    return "絞り込み条件に一致するリソースがありません。";
  }
  if (hasTimeFilter) {
    return "指定した時間帯に空きのあるリソースがありません。";
  }
  return "リソースがありません。";
}

export function setKeywordParam(params: URLSearchParams, value: FormDataEntryValue | null): void {
  if (typeof value !== "string") return;

  const keyword = value.trim();
  if (keyword) {
    params.set("keyword", keyword);
  }
}

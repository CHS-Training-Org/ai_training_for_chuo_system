/** `global-setup.ts` が生成する、ロール別 storageState ファイルのパス。 */
export const AUTH_STATE = {
  member: "tests/e2e/.auth/member.json",
  approver: "tests/e2e/.auth/approver.json",
} as const;

import type { Page, TestInfo } from "@playwright/test";
import { test, expect } from "../helpers/workflow-test";
import { evidence, usedValue } from "../helpers/evidence";
import {
  E2E_PURPOSE_PREFIX,
  existingPurposeFor,
  slotFor,
  toDatetimeLocal,
} from "../helpers/reservations";
import {
  apiAs,
  cancelReservationAs,
  createReservationAs,
  decideAsAdmin,
  findActiveResource,
  findOrCreateInactiveResource,
  listResources,
  type Resource,
} from "../helpers/setup-data";

/**
 * リソース一覧（/resources）の結合テスト。
 *
 * 元にした試験仕様書: Docs/test/resources/cases.md（RES-LIST-TC-001〜RES-LIST-TC-025）
 * 期待結果は試験ケースから取る。実装の振る舞いに合わせて弱めない。
 */

/** 画面に出るカテゴリの表示名（実装の RESOURCE_CATEGORY_LABELS と同じ）。 */
const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "会議室",
  EQUIPMENT: "備品",
  VEHICLE: "社用車",
};

/** 空き確認で絞り込み中に出るメッセージの一部。絞り込みが画面に反映されたかの目印にする。 */
const FILTER_MESSAGE = "の空きリソースを表示しています";

/** 1 ページあたりの表示件数（api-spec.md 共通仕様 > ページネーション規約）。 */
const PAGE_SIZE = 20;

/** ページ送りの確認のために足す有効なリソースの件数（初期データの 3 件と合わせて PAGE_SIZE + 1 件になる）。 */
const EXTRA_RESOURCES_FOR_PAGING = PAGE_SIZE + 1 - 3;

/** location は helpers の Resource 型にないため、この画面のテストでだけ足して扱う。 */
type ResourceWithLocation = Resource & { location: string | null };

function plusMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

/** リソース一覧を開き、見出しが出るまで待つ（出なくてもエビデンスを残せるよう先へ進む）。 */
async function openResourceList(page: Page): Promise<void> {
  await page.goto("/resources");
  await page
    .getByRole("heading", { name: "リソース一覧", level: 1 })
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
}

/** リソースカードの「詳細を見る」リンク（1 枚のカードに 1 つ）。件数を数えるのにも使う。 */
function detailLinks(page: Page) {
  return page.getByRole("link", { name: /詳細を見る/ });
}

/** 今表示されているリソースカードのリソース ID を、「詳細を見る」リンクの遷移先から読む。 */
async function listedResourceIds(page: Page): Promise<string[]> {
  const links = detailLinks(page);
  await links
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  return hrefs.map((href) => href.split("/").pop() ?? "");
}

/** カテゴリフィルターで分類を選び、絞り込む。URL が変わるまで待つ。 */
async function filterByCategory(page: Page, label: string): Promise<void> {
  await usedValue("カテゴリフィルター", label);
  const before = page.url();
  await page.getByLabel("カテゴリ").click();
  await page.getByRole("option", { name: label }).click();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await page
    .waitForURL((url) => url.toString() !== before, { timeout: 10_000 })
    .catch(() => undefined);
}

/** 空き確認フォームに開始日時・終了日時を入れて絞り込み、絞り込み中のメッセージが出るまで待つ。 */
async function filterByPeriod(page: Page, from: Date, to: Date): Promise<void> {
  await usedValue("空き確認の開始日時", from);
  await usedValue("空き確認の終了日時", to);
  await page.getByLabel("開始日時").fill(toDatetimeLocal(from));
  await page.getByLabel("終了日時").fill(toDatetimeLocal(to));
  await page.getByRole("button", { name: "絞り込む" }).click();
  await page
    .getByText(FILTER_MESSAGE)
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
}

/** カテゴリフィルターのケースが使う、会議室・備品・社用車のリソースを初期データから選ぶ。 */
async function prepareCategoryResources(): Promise<{
  room: Resource;
  equipment: Resource;
  vehicle: Resource;
}> {
  const room = await findActiveResource(
    (r) => r.category === "ROOM",
    "カテゴリが会議室の有効なリソース",
  );
  const equipment = await findActiveResource(
    (r) => r.category === "EQUIPMENT",
    "カテゴリが備品の有効なリソース",
  );
  const vehicle = await findActiveResource(
    (r) => r.category === "VEHICLE",
    "カテゴリが社用車の有効なリソース",
  );
  await usedValue("リソース（RES-LIST-D-02・会議室）", room.name);
  await usedValue("リソース（RES-LIST-D-03・備品）", equipment.name);
  await usedValue("リソース（RES-LIST-D-04・社用車）", vehicle.name);
  return { room, equipment, vehicle };
}

/**
 * 空き確認のケースの前提をそろえる。
 *
 * 承認フローの要否で選んだリソースに、割り当て枠の開始の 20 分後から 40 分後までの既存予約を 1 件作る
 * （試験仕様書 3 章「AI が仮に決めた値」の 2）。after を渡すと、その予約を却下またはキャンセルする。
 */
async function prepareExistingReservation(
  testInfo: TestInfo,
  options: { requiresApproval: boolean; dataId: string; after?: "reject" | "cancel" },
): Promise<{ resource: Resource; slotStart: Date }> {
  const { start } = slotFor(testInfo);
  const resource = await findActiveResource(
    (r) => r.requiresApproval === options.requiresApproval,
    options.requiresApproval ? "承認フローが必要な有効なリソース" : "承認フローが不要な有効なリソース",
  );
  const existingStart = plusMinutes(start, 20);
  const existingEnd = plusMinutes(start, 40);
  const reservation = await createReservationAs("member", {
    resourceId: resource.id,
    start: existingStart,
    end: existingEnd,
    purpose: existingPurposeFor(testInfo),
  });
  if (options.after === "reject") await decideAsAdmin(reservation.id, "reject");
  if (options.after === "cancel") await cancelReservationAs("member", reservation.id);

  const statusLabel =
    options.after === "reject"
      ? "却下"
      : options.after === "cancel"
        ? "キャンセル済み"
        : options.requiresApproval
          ? "承認待ち"
          : "承認済み";
  await usedValue(`リソース（${options.dataId}）`, resource.name);
  await usedValue(`既存予約（${options.dataId}）の開始日時`, existingStart);
  await usedValue(`既存予約（${options.dataId}）の終了日時`, existingEnd);
  await usedValue(`既存予約（${options.dataId}）の状態`, statusLabel);
  return { resource, slotStart: start };
}

/**
 * 有効なリソースを ADMIN の API で足す（ページ送りのケース用）。
 * 初期データの有効なリソースは 3 件しかなく、1 ページ（20 件）を超えないため。
 */
async function createActiveResources(count: number): Promise<Resource[]> {
  const api = await apiAs("admin");
  try {
    const created: Resource[] = [];
    for (let i = 1; i <= count; i++) {
      const name = `${E2E_PURPOSE_PREFIX} ページ送り確認 ${String(i).padStart(2, "0")}`;
      const res = await api.post("/api/resources", {
        data: {
          name,
          category: "EQUIPMENT",
          capacity: null,
          location: null,
          requiresApproval: false,
          isActive: true,
          description: "結合テストがページ送りを確かめるために足したリソース。",
        },
      });
      if (!res.ok()) {
        throw new Error(`リソースの作成に失敗した（${res.status()}）：${await res.text()}`);
      }
      created.push((await res.json()) as Resource);
    }
    return created;
  } finally {
    await api.dispose();
  }
}

test.describe("2.1 画面アクセス・認可", () => {
  test("RES-LIST-TC-001 MEMBER でサインインしてリソース一覧を開くと、リソースの一覧が表示される", async ({
    page,
  }) => {
    await usedValue("サインインしたロール", "一般社員（MEMBER）");

    await openResourceList(page);

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByRole("heading", { name: "リソース一覧", level: 1 }),
        "リソース一覧の画面が表示されている",
      )
      .toBeVisible();
    await expect(
      detailLinks(page),
      "リソースカード一覧に、リソースのカードが 1 件以上表示されている",
    )
      .not.toHaveCount(0);
  });

  test.describe("APPROVER でサインイン済み", () => {
    test.use({ storageState: "playwright/.auth/approver.json" });

    test("RES-LIST-TC-002 APPROVER でサインインしてリソース一覧を開くと、リソースの一覧が表示される", async ({
      page,
    }) => {
      await usedValue("サインインしたロール", "承認者（APPROVER）");

      await openResourceList(page);

      await evidence(page, "リソースカード一覧");
      await expect
        .soft(
          page.getByRole("heading", { name: "リソース一覧", level: 1 }),
          "リソース一覧の画面が表示されている",
        )
        .toBeVisible();
      await expect(
        detailLinks(page),
        "リソースカード一覧に、リソースのカードが 1 件以上表示されている",
      )
        .not.toHaveCount(0);
    });
  });

  test.describe("ADMIN でサインイン済み", () => {
    test.use({ storageState: "playwright/.auth/admin.json" });

    test("RES-LIST-TC-003 ADMIN でサインインしてリソース一覧を開くと、リソースの一覧が表示される", async ({
      page,
    }) => {
      await usedValue("サインインしたロール", "管理者（ADMIN）");

      await openResourceList(page);

      await evidence(page, "リソースカード一覧");
      await expect
        .soft(
          page.getByRole("heading", { name: "リソース一覧", level: 1 }),
          "リソース一覧の画面が表示されている",
        )
        .toBeVisible();
      await expect(
        detailLinks(page),
        "リソースカード一覧に、リソースのカードが 1 件以上表示されている",
      )
        .not.toHaveCount(0);
    });
  });
});

test.describe("2.2 初期表示", () => {
  test("RES-LIST-TC-004 リソース一覧を開くと、リソースのカードに名称・カテゴリ・場所・定員・承認フロー要否が表示される", async ({
    page,
  }) => {
    const resource = (await findActiveResource(
      (r) =>
        r.capacity != null &&
        r.requiresApproval &&
        (r as ResourceWithLocation).location != null,
      "名称・カテゴリ・場所・定員・承認フロー要否がすべて設定されている有効なリソース",
    )) as ResourceWithLocation;
    await usedValue("リソース（RES-LIST-D-01）の名称", resource.name);
    await usedValue("リソース（RES-LIST-D-01）のカテゴリ", CATEGORY_LABELS[resource.category]);
    await usedValue("リソース（RES-LIST-D-01）の場所", resource.location);
    await usedValue("リソース（RES-LIST-D-01）の定員", resource.capacity);
    await usedValue("リソース（RES-LIST-D-01）の承認フロー要否", "要承認");

    await openResourceList(page);

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByText(resource.name, { exact: true }),
        "リソースカードに、リソース（RES-LIST-D-01）の名称が表示されている",
      )
      .toBeVisible();
    // カテゴリの表示（カードのバッジ）は、カテゴリフィルターが内部に持つ隠れた選択肢と同じ文字なので、
    // 画面に見えているものだけに絞る
    const categoryOnCard = page
      .getByText(CATEGORY_LABELS[resource.category], { exact: true })
      .filter({ visible: true });
    await expect
      .soft(
        categoryOnCard,
        "リソースカードに、リソース（RES-LIST-D-01）のカテゴリが表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(resource.location ?? ""),
        "リソースカードに、リソース（RES-LIST-D-01）の場所が表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(`定員 ${resource.capacity} 名`),
        "リソースカードに、リソース（RES-LIST-D-01）の定員が表示されている",
      )
      .toBeVisible();
    await expect(
      page.getByText("要承認"),
      "リソースカードに、リソース（RES-LIST-D-01）の承認フロー要否（要承認）が表示されている",
    ).toBeVisible();
  });
});

test.describe("2.3 カテゴリフィルター", () => {
  test("RES-LIST-TC-005 カテゴリで「会議室」を選ぶと、会議室のリソースだけが表示される", async ({
    page,
  }) => {
    const { room, equipment, vehicle } = await prepareCategoryResources();

    await openResourceList(page);
    await filterByCategory(page, "会議室");

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByText(room.name, { exact: true }),
        "リソースカード一覧に、会議室のリソース（RES-LIST-D-02）のカードが表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(equipment.name, { exact: true }),
        "リソースカード一覧に、備品のリソース（RES-LIST-D-03）のカードがない",
      )
      .toHaveCount(0);
    await expect(
      page.getByText(vehicle.name, { exact: true }),
      "リソースカード一覧に、社用車のリソース（RES-LIST-D-04）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-006 カテゴリで「備品」を選ぶと、備品のリソースだけが表示される", async ({
    page,
  }) => {
    const { room, equipment, vehicle } = await prepareCategoryResources();

    await openResourceList(page);
    await filterByCategory(page, "備品");

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByText(equipment.name, { exact: true }),
        "リソースカード一覧に、備品のリソース（RES-LIST-D-03）のカードが表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(room.name, { exact: true }),
        "リソースカード一覧に、会議室のリソース（RES-LIST-D-02）のカードがない",
      )
      .toHaveCount(0);
    await expect(
      page.getByText(vehicle.name, { exact: true }),
      "リソースカード一覧に、社用車のリソース（RES-LIST-D-04）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-007 カテゴリで「社用車」を選ぶと、社用車のリソースだけが表示される", async ({
    page,
  }) => {
    const { room, equipment, vehicle } = await prepareCategoryResources();

    await openResourceList(page);
    await filterByCategory(page, "社用車");

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByText(vehicle.name, { exact: true }),
        "リソースカード一覧に、社用車のリソース（RES-LIST-D-04）のカードが表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(room.name, { exact: true }),
        "リソースカード一覧に、会議室のリソース（RES-LIST-D-02）のカードがない",
      )
      .toHaveCount(0);
    await expect(
      page.getByText(equipment.name, { exact: true }),
      "リソースカード一覧に、備品のリソース（RES-LIST-D-03）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-008 カテゴリで「すべて」を選ぶと、会議室・備品・社用車のいずれのリソースも表示される", async ({
    page,
  }) => {
    const { room, equipment, vehicle } = await prepareCategoryResources();

    await openResourceList(page);
    await filterByCategory(page, "すべて");

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(
        page.getByText(room.name, { exact: true }),
        "リソースカード一覧に、会議室のリソース（RES-LIST-D-02）のカードが表示されている",
      )
      .toBeVisible();
    await expect
      .soft(
        page.getByText(equipment.name, { exact: true }),
        "リソースカード一覧に、備品のリソース（RES-LIST-D-03）のカードが表示されている",
      )
      .toBeVisible();
    await expect(
      page.getByText(vehicle.name, { exact: true }),
      "リソースカード一覧に、社用車のリソース（RES-LIST-D-04）のカードが表示されている",
    ).toBeVisible();
  });
});

test.describe("2.4 空き確認フォーム（開始日時・終了日時）", () => {
  test("RES-LIST-TC-009 既存の予約の終了より後に収まる時間帯で空き確認すると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 45), plusMinutes(slotStart, 55));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-010 既存の予約の開始より前に収まる時間帯で空き確認すると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 5), plusMinutes(slotStart, 15));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-011 空き確認の開始日時を既存の予約の終了と同じにすると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 40), plusMinutes(slotStart, 55));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-012 空き確認の終了日時を既存の予約の開始と同じにすると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 5), plusMinutes(slotStart, 20));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-013 既存の予約と一部だけ重なる時間帯で空き確認すると、そのリソースが一覧から外れる", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 30), plusMinutes(slotStart, 50));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-014 既存の予約を内側に含む時間帯で空き確認すると、そのリソースが一覧から外れる", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 10), plusMinutes(slotStart, 50));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-015 既存の予約の内側に収まる時間帯で空き確認すると、そのリソースが一覧から外れる", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 25), plusMinutes(slotStart, 35));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、既存予約のあるリソース（RES-LIST-D-05）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-016 承認待ちの予約と重なる時間帯で空き確認すると、そのリソースが一覧から外れる", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: true,
      dataId: "RES-LIST-D-06",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 25), plusMinutes(slotStart, 35));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、承認待ちの予約があるリソース（RES-LIST-D-06）のカードがない",
    ).toHaveCount(0);
  });

  test("RES-LIST-TC-017 却下された予約だけがある時間帯で空き確認すると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: true,
      dataId: "RES-LIST-D-06",
      after: "reject",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 25), plusMinutes(slotStart, 35));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、却下された予約があるリソース（RES-LIST-D-06）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-018 キャンセルされた予約だけがある時間帯で空き確認すると、そのリソースが一覧に残る", async ({
    page,
  }, testInfo) => {
    const { resource, slotStart } = await prepareExistingReservation(testInfo, {
      requiresApproval: false,
      dataId: "RES-LIST-D-05",
      after: "cancel",
    });

    await openResourceList(page);
    await filterByPeriod(page, plusMinutes(slotStart, 25), plusMinutes(slotStart, 35));

    await evidence(page, "リソースカード一覧");
    await expect(
      page.getByText(FILTER_MESSAGE),
      "空き確認の絞り込みが画面に反映されている（絞り込み中のメッセージが表示されている）",
    ).toBeVisible();
    await expect(
      page.getByText(resource.name, { exact: true }),
      "リソースカード一覧に、キャンセルされた予約があるリソース（RES-LIST-D-05）のカードが表示されている",
    ).toBeVisible();
  });

  test("RES-LIST-TC-019 開始日時と終了日時を入れて絞り込むと、対象の期間と件数のメッセージが表示される", async ({
    page,
  }, testInfo) => {
    const resource = await findActiveResource(
      (r) => !r.requiresApproval,
      "承認フローが不要な有効なリソース",
    );
    await usedValue("リソース（RES-LIST-D-05）", resource.name);
    const { start } = slotFor(testInfo);
    const from = start;
    const to = plusMinutes(start, 60);

    await openResourceList(page);
    await filterByPeriod(page, from, to);

    await evidence(page, "絞り込みのメッセージ");
    const message = page.getByText(FILTER_MESSAGE);
    await expect(message, "絞り込み中のメッセージが表示されている").toBeVisible();
    const text = (await message.textContent()) ?? "";
    expect
      .soft(text, "絞り込みのメッセージに、絞り込みの対象にした開始日時が示されている")
      .toContain(toDatetimeLocal(from));
    expect
      .soft(text, "絞り込みのメッセージに、絞り込みの対象にした終了日時が示されている")
      .toContain(toDatetimeLocal(to));
    expect(text, "絞り込みのメッセージに、絞り込んだ結果の件数が示されている").toMatch(/\d+\s*件/);
  });
});

test.describe("2.5 ページ送り", () => {
  test("RES-LIST-TC-020 表示対象のリソースが 20 件を超えるとき、1 ページ目に 20 件表示される", async ({
    page,
  }) => {
    const created = await createActiveResources(EXTRA_RESOURCES_FOR_PAGING);
    await usedValue("足した有効なリソース（RES-LIST-D-08）の件数", created.length);
    const visible = await listResources("member");
    await usedValue("MEMBER に表示される有効なリソースの合計件数", visible.length);

    await openResourceList(page);

    await evidence(page, "リソースカード一覧とページネーション");
    await expect
      .soft(
        page.getByRole("link", { name: /次へ/ }),
        "ページネーションに、次のページへ進むリンクが表示されている（2 ページ目以降がある）",
      )
      .toBeVisible();
    // 1 ページあたりの件数（PAGE_SIZE）は、画面の「確かめたこと」に数字で出るよう直に書く
    await expect(
      detailLinks(page),
      "リソースカード一覧に、リソースのカードが 20 件表示されている",
    ).toHaveCount(20);
  });

  test("RES-LIST-TC-021 2 ページ目を開くと、1 ページ目に表示されなかったリソースが表示される", async ({
    page,
  }) => {
    const created = await createActiveResources(EXTRA_RESOURCES_FOR_PAGING);
    await usedValue("足した有効なリソース（RES-LIST-D-08）の件数", created.length);

    await openResourceList(page);
    const firstPageIds = await listedResourceIds(page);
    await usedValue("1 ページ目に表示されたリソースの件数", firstPageIds.length);

    await page.getByRole("link", { name: /次へ/ }).click();
    await page
      .getByText(/^2 \/ \d+ ページ/)
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => undefined);
    const secondPageIds = await listedResourceIds(page);
    await usedValue("2 ページ目に表示されたリソースの件数", secondPageIds.length);
    const onlyOnSecondPage = secondPageIds.filter((id) => !firstPageIds.includes(id));
    await usedValue("2 ページ目だけに表示されたリソースの件数", onlyOnSecondPage.length);

    await evidence(page, "リソースカード一覧");
    await expect
      .soft(detailLinks(page), "2 ページ目に、リソースのカードが 1 件以上表示されている")
      .not.toHaveCount(0);
    expect(
      onlyOnSecondPage.length,
      "2 ページ目に、1 ページ目に表示されなかったリソースが表示されている",
    ).toBeGreaterThan(0);
  });
});

test.describe("2.6 操作後の結果と画面遷移", () => {
  test("RES-LIST-TC-022 リソースカードの「詳細を見る」を押すと、そのリソースの詳細画面へ遷移する", async ({
    page,
  }) => {
    await openResourceList(page);
    const firstLink = detailLinks(page).first();
    await firstLink.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    const href = (await firstLink.getAttribute("href")) ?? "";
    await usedValue("押した「詳細を見る」リンクの遷移先", href);

    await firstLink.click();
    await page
      .waitForURL((url) => url.pathname === href, { timeout: 10_000 })
      .catch(() => undefined);

    await evidence(page, "遷移後の画面");
    await expect(page, "押したリソースのリソース詳細（/resources/{id}）へ遷移している").toHaveURL(
      href,
    );
  });
});

test.describe("2.7 ロールによる違い", () => {
  test("RES-LIST-TC-023 MEMBER で開くと、無効にされたリソースが一覧に表示されない", async ({
    page,
  }) => {
    await usedValue("サインインしたロール", "一般社員（MEMBER）");
    const inactive = await findOrCreateInactiveResource();
    await usedValue("無効にされたリソース（RES-LIST-D-07）", inactive.name);

    await openResourceList(page);

    await evidence(page, "リソースカード一覧");
    await expect(
      detailLinks(page),
      "リソースカード一覧に、リソースのカードが 1 件以上表示されている",
    )
      .not.toHaveCount(0);
    await expect(
      page.getByText(inactive.name, { exact: true }),
      "リソースカード一覧に、無効にされたリソース（RES-LIST-D-07）のカードがない",
    ).toHaveCount(0);
  });

  test.describe("APPROVER でサインイン済み", () => {
    test.use({ storageState: "playwright/.auth/approver.json" });

    test("RES-LIST-TC-024 APPROVER で開くと、無効にされたリソースが一覧に表示されない", async ({
      page,
    }) => {
      await usedValue("サインインしたロール", "承認者（APPROVER）");
      const inactive = await findOrCreateInactiveResource();
      await usedValue("無効にされたリソース（RES-LIST-D-07）", inactive.name);

      await openResourceList(page);

      await evidence(page, "リソースカード一覧");
      await expect(
        detailLinks(page),
        "リソースカード一覧に、リソースのカードが 1 件以上表示されている",
      )
        .not.toHaveCount(0);
      await expect(
        page.getByText(inactive.name, { exact: true }),
        "リソースカード一覧に、無効にされたリソース（RES-LIST-D-07）のカードがない",
      ).toHaveCount(0);
    });
  });

  test.describe("ADMIN でサインイン済み", () => {
    test.use({ storageState: "playwright/.auth/admin.json" });

    test("RES-LIST-TC-025 ADMIN で開くと、無効にされたリソースも一覧に表示される", async ({
      page,
    }) => {
      await usedValue("サインインしたロール", "管理者（ADMIN）");
      const inactive = await findOrCreateInactiveResource();
      await usedValue("無効にされたリソース（RES-LIST-D-07）", inactive.name);

      await openResourceList(page);

      await evidence(page, "リソースカード一覧");
      await expect(
        page.getByText(inactive.name, { exact: true }),
        "リソースカード一覧に、無効にされたリソース（RES-LIST-D-07）のカードが表示されている",
      ).toBeVisible();
    });
  });
});

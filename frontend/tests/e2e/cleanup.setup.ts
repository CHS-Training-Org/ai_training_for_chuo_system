import { test as setup } from "@playwright/test";
import { cancelE2EReservations } from "./helpers/reservations";

/**
 * テスト本体が走る前に、前回の実行が残した予約を片付ける。
 *
 * 各テストは自分が作った予約を後片付けするが、実行を強制終了した場合など、
 * 後片付けが走らずに終わることがある。残った予約は時間帯を塞いだままなので、
 * 次の実行が重複予約で落ちる。ここで取りこぼしを回収しておく。
 *
 * 本体のテストが始まる前に一度だけ走るため、印の付いた予約をまとめて対象にしてよい。
 * ADMIN で実行するのは、予約一覧とキャンセルで全件を扱えるのが ADMIN だけであり、
 * MEMBER 以外のセッションで作られた予約も回収する必要があるためである。
 */
setup("前回の実行が残した予約を片付ける", async () => {
  const cancelled = await cancelE2EReservations({ role: "admin" });
  if (cancelled > 0) {
    console.log(`[cleanup] 前回の実行が残した予約を ${cancelled} 件キャンセルした`);
  }
});

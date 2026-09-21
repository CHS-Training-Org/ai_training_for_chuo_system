// 収集済みの JSONL から週次・月次・ユーザー別の集計を作り、整形済み CSV の再生成と
// GitHub Actions の Job Summary への出力を行う（claude-usage-report.yml から実行）。
//
// CSV は将来の公開（ダッシュボード化）で参照する整形データ。集計ロジックを変えたときに
// 過去分もまとめて作り直せるよう、JSONL から毎回作り直す方式にしている。
//
// 環境変数:
//   DATA_FILE            入力 JSONL のパス
//   OUTPUT_DIR           CSV の出力先ディレクトリ
//   GITHUB_STEP_SUMMARY  Job Summary の出力先（未設定なら標準出力）
//   NOW                  集計基準時刻（ISO 8601、既定: 現在時刻）

import fs from 'node:fs';
import path from 'node:path';
import {
  aggregateBy,
  monthKeyJst,
  recentMonthKeys,
  recentWeekKeys,
  weekKeyJst,
} from './lib/claude-usage.mjs';

const dataFile = requireEnv('DATA_FILE');
const outputDir = requireEnv('OUTPUT_DIR');
const now = process.env.NOW || new Date().toISOString();

const MONTHS_SHOWN = 13;
const WEEKS_SHOWN = 13;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が未設定です`);
  return value;
}

function readRecords() {
  if (!fs.existsSync(dataFile)) return [];
  return fs
    .readFileSync(dataFile, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
    // Claude が実際に起動しなかったジョブ（トリガ条件に一致しただけの実行）は集計に含めない。
    .filter((record) => record.claude_ran);
}

const CSV_COLUMNS = [
  'runs',
  'measured_runs',
  'unmeasured_runs',
  'input_tokens',
  'output_tokens',
  'cache_read_tokens',
  'cache_creation_tokens',
  'total_tokens',
  'cost_usd',
];

function bucketToCsvValues(bucket) {
  return [
    bucket.runs,
    bucket.measured_runs,
    bucket.unmeasured_runs,
    bucket.tokens.input,
    bucket.tokens.output,
    bucket.tokens.cache_read,
    bucket.tokens.cache_creation,
    bucket.tokens.total,
    bucket.cost_usd,
  ];
}

function writeCsv(fileName, headerKeys, rows) {
  const lines = [headerKeys.join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  const filePath = path.join(outputDir, fileName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function num(value) {
  return Number(value ?? 0).toLocaleString('ja-JP');
}

function usd(value) {
  return `$${Number(value ?? 0).toFixed(4)}`;
}

/** 指定キー列に対して、データが無い期間も 0 埋めして並べる。 */
function alignBuckets(buckets, keys) {
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  return keys.map(
    (key) =>
      byKey.get(key) ?? {
        key,
        runs: 0,
        measured_runs: 0,
        unmeasured_runs: 0,
        tokens: { input: 0, output: 0, cache_read: 0, cache_creation: 0, thinking: 0, total: 0 },
        cost_usd: 0,
      },
  );
}

function periodTable(title, buckets) {
  const lines = [
    `### ${title}`,
    '',
    '| 期間 | 実行回数 | 入力 | 出力 | キャッシュ読取 | 合計トークン | コスト(USD) |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const b of buckets) {
    const unmeasured = b.unmeasured_runs > 0 ? `${b.runs}（うち未計測 ${b.unmeasured_runs}）` : num(b.runs);
    lines.push(
      `| ${b.key} | ${unmeasured} | ${num(b.tokens.input)} | ${num(b.tokens.output)} | ${num(b.tokens.cache_read)} | **${num(b.tokens.total)}** | ${usd(b.cost_usd)} |`,
    );
  }
  return lines.join('\n');
}

function userTable(title, buckets) {
  const sorted = [...buckets].sort((a, b) => b.tokens.total - a.tokens.total || b.cost_usd - a.cost_usd);
  const lines = [
    `### ${title}`,
    '',
    '| 実行者 | 実行回数 | 合計トークン | コスト(USD) |',
    '|---|---:|---:|---:|',
  ];
  if (sorted.length === 0) lines.push('| （データなし） | 0 | 0 | $0.0000 |');
  for (const b of sorted) {
    const unmeasured = b.unmeasured_runs > 0 ? `${b.runs}（うち未計測 ${b.unmeasured_runs}）` : num(b.runs);
    lines.push(`| ${b.key} | ${unmeasured} | ${num(b.tokens.total)} | ${usd(b.cost_usd)} |`);
  }
  return lines.join('\n');
}

/** 月別推移のグラフ。表だけでは 1 年分の増減が読み取りにくいため添える。 */
function monthlyChart(buckets) {
  const labels = buckets.map((b) => `"${b.key.slice(2)}"`).join(', ');
  const values = buckets.map((b) => b.tokens.total).join(', ');
  return [
    '```mermaid',
    'xychart-beta',
    '    title "月別トークン消費量"',
    `    x-axis [${labels}]`,
    '    y-axis "トークン"',
    `    bar [${values}]`,
    '```',
  ].join('\n');
}

function totalsOf(buckets) {
  return buckets.reduce(
    (acc, b) => ({
      runs: acc.runs + b.runs,
      tokens: acc.tokens + b.tokens.total,
      cost: acc.cost + b.cost_usd,
      unmeasured: acc.unmeasured + b.unmeasured_runs,
    }),
    { runs: 0, tokens: 0, cost: 0, unmeasured: 0 },
  );
}

function main() {
  const records = readRecords();

  const monthKeys = recentMonthKeys(now, MONTHS_SHOWN);
  const weekKeys = recentWeekKeys(now, WEEKS_SHOWN);
  const currentMonth = monthKeyJst(now);
  const currentWeek = weekKeyJst(now);
  const yearMonthKeys = new Set(recentMonthKeys(now, 12));

  const monthly = aggregateBy(records, (r) => r.month);
  const weekly = aggregateBy(records, (r) => r.week);
  const byUserMonthly = aggregateBy(records, (r) => `${r.month}\u0000${r.actor ?? 'unknown'}`);
  const lastYearRecords = records.filter((r) => yearMonthKeys.has(r.month));
  const byUserYear = aggregateBy(lastYearRecords, (r) => r.actor ?? 'unknown');
  const byUserCurrentMonth = aggregateBy(
    records.filter((r) => r.month === currentMonth),
    (r) => r.actor ?? 'unknown',
  );

  writeCsv('weekly.csv', ['week', ...CSV_COLUMNS], weekly.map((b) => [b.key, ...bucketToCsvValues(b)]));
  writeCsv('monthly.csv', ['month', ...CSV_COLUMNS], monthly.map((b) => [b.key, ...bucketToCsvValues(b)]));
  writeCsv(
    'by-user-monthly.csv',
    ['month', 'actor', ...CSV_COLUMNS],
    byUserMonthly.map((b) => {
      const [month, actor] = b.key.split('\u0000');
      return [month, actor, ...bucketToCsvValues(b)];
    }),
  );

  const monthlyAligned = alignBuckets(monthly, monthKeys);
  const weeklyAligned = alignBuckets(weekly, weekKeys);
  const thisWeek = weeklyAligned.find((b) => b.key === currentWeek) ?? { runs: 0, tokens: { total: 0 }, cost_usd: 0 };
  const thisMonth = monthlyAligned.find((b) => b.key === currentMonth) ?? { runs: 0, tokens: { total: 0 }, cost_usd: 0 };
  const yearTotals = totalsOf(monthlyAligned.filter((b) => yearMonthKeys.has(b.key)));
  const unmeasuredTotal = records.filter((r) => !r.tokens_available).length;

  const summary = [
    '# Claude Code トークン消費量レポート',
    '',
    `集計基準: ${new Date(now).toISOString()}（週・月の区切りは JST）／ 対象実行 ${num(records.length)} ジョブ`,
    '',
    '## サマリー',
    '',
    '| 指標 | 実行回数 | 合計トークン | コスト(USD) |',
    '|---|---:|---:|---:|',
    `| 今週（${currentWeek}） | ${num(thisWeek.runs)} | ${num(thisWeek.tokens.total)} | ${usd(thisWeek.cost_usd)} |`,
    `| 今月（${currentMonth}） | ${num(thisMonth.runs)} | ${num(thisMonth.tokens.total)} | ${usd(thisMonth.cost_usd)} |`,
    `| 直近12か月 | ${num(yearTotals.runs)} | ${num(yearTotals.tokens)} | ${usd(yearTotals.cost)} |`,
    '',
    '## 推移',
    '',
    monthlyChart(monthlyAligned),
    '',
    periodTable(`月別（直近${MONTHS_SHOWN}か月）`, monthlyAligned),
    '',
    periodTable(`週別（直近${WEEKS_SHOWN}週）`, weeklyAligned),
    '',
    '## 実行者別',
    '',
    userTable(`今月（${currentMonth}）`, byUserCurrentMonth),
    '',
    userTable('直近12か月', byUserYear),
    '',
    '## 注記',
    '',
    `- **未計測の実行が ${num(unmeasuredTotal)} 件あります。** トークン数は \`show_full_output: true\` を指定したジョブのログにしか出力されません。指定前の実行はコストのみ記録され、トークンは 0 として集計されます（実行回数の「うち未計測」列を参照）。`,
    '- **コストは list price 換算の参考値**であり、実際の請求額ではありません（サブスクリプション認証で実行しているため）。',
    '- **GitHub Actions のログ保持期間は 90 日**です。トークン数はログ本文にしか存在しないため、この期間を過ぎた実行は遡って計測できません。表示できる過去分は、この仕組みを動かし始めて以降に蓄積したデータに限られます。',
    '',
  ].join('\n');

  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) fs.appendFileSync(target, summary + '\n');
  else console.log(summary);
}

main();

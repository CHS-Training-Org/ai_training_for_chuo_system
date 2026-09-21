// claude.yml の実行ログからトークン消費量・コストを取り出し、週次・月次・ユーザー別に
// 集計するための純粋関数群（I/O は collect-claude-usage.mjs / render-claude-usage-summary.mjs 側）。
//
// ログのパースは claude-code-action の出力様式に依存するため壊れやすい。実ログを固定した
// フィクスチャで .github/scripts/lib/claude-usage.test.mjs が検証している。様式が変わったら
// まずテストを実ログで更新すること。

/** ログ行の先頭に付く ISO タイムスタンプ（例: `2026-09-18T10:10:21.5981326Z `）。 */
const TIMESTAMP_PREFIX = /^\S+Z\s/;

/**
 * 結果 JSON の終端マーカー。action は JSON を出力した直後にこの行を出す。
 * `"type": "result"` はオブジェクト末尾近くに現れるため開始マーカーには使えず、
 * 前方検索も `SDK options: {` 等を誤検出するため、この行からの後方走査が唯一確実な方法。
 */
const RESULT_LOG_MARKER = 'Log saved to ';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** トークン数の内訳キー。action の modelUsage 側のキー名 -> 集計側のキー名。 */
const TOKEN_KEYS = {
  inputTokens: 'input',
  outputTokens: 'output',
  cacheReadInputTokens: 'cache_read',
  cacheCreationInputTokens: 'cache_creation',
  thinkingTokens: 'thinking',
};

function stripTimestamp(line) {
  return line.replace(TIMESTAMP_PREFIX, '');
}

function emptyTokens() {
  return { input: 0, output: 0, cache_read: 0, cache_creation: 0, thinking: 0, total: 0 };
}

/** total は課金・消費の総量として input + output + キャッシュ分を合算する（thinking は output の内数）。 */
function withTotal(tokens) {
  return { ...tokens, total: tokens.input + tokens.output + tokens.cache_read + tokens.cache_creation };
}

/**
 * ジョブログ全文から結果 JSON のブロックを取り出す。
 * 1 ジョブに複数ブロックが出ることがある（action 側の result_index が示唆する）ため配列で返す。
 */
export function extractResultBlocks(logText) {
  const lines = logText.split(/\r?\n/).map(stripTimestamp);
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(RESULT_LOG_MARKER)) continue;

    const end = findLineBackwards(lines, i - 1, '}');
    if (end < 0) continue;
    const start = findLineBackwards(lines, end - 1, '{');
    if (start < 0) continue;

    const parsed = tryParseJson(lines.slice(start, end + 1).join('\n'));
    if (parsed?.type === 'result') blocks.push(parsed);
  }
  return blocks;
}

/** pretty-print された JSON では入れ子の括弧が必ずインデントされるため、インデント 0 の行だけを見れば境界が分かる。 */
function findLineBackwards(lines, from, target) {
  for (let i = from; i >= 0; i--) {
    if (lines[i] === target) return i;
  }
  return -1;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 結果ブロック群を 1 ジョブ分の使用量へ正規化する。
 *
 * `show_full_output: true` のジョブはモデル別の modelUsage にトークン数が入るが、
 * 指定なしのジョブはトークン数が秘匿されコストのみになる。両者を区別できるよう
 * tokens_available を持たせる（「0 トークン」と「そもそも測れない」の取り違えを防ぐ）。
 */
export function summarizeResultBlocks(blocks) {
  const tokens = emptyTokens();
  const models = {};
  let costUsd = 0;
  let hasCost = false;
  let tokensAvailable = false;
  let numTurns = 0;
  let durationMs = 0;
  let isError = false;

  for (const block of blocks) {
    numTurns += block.num_turns ?? 0;
    durationMs += block.duration_ms ?? 0;
    isError = isError || block.is_error === true;

    let blockCostFromModels = 0;
    for (const [modelId, usage] of Object.entries(block.modelUsage ?? {})) {
      const modelTokens = emptyTokens();
      let measured = false;
      for (const [sourceKey, targetKey] of Object.entries(TOKEN_KEYS)) {
        if (typeof usage?.[sourceKey] !== 'number') continue;
        modelTokens[targetKey] += usage[sourceKey];
        measured = true;
      }
      // 現行 action の秘匿版も modelUsage 自体は持つが contextWindow 等しか残さないため、
      // トークン数のキーが実在したときだけ「計測できた」と判定する。
      if (!measured) continue;
      tokensAvailable = true;

      const totals = withTotal(modelTokens);
      const modelCost = typeof usage.costUSD === 'number' ? usage.costUSD : 0;
      blockCostFromModels += modelCost;

      const current = models[modelId] ?? { ...emptyTokens(), cost_usd: 0 };
      for (const key of Object.keys(totals)) current[key] += totals[key];
      current.cost_usd += modelCost;
      models[modelId] = current;

      for (const key of Object.keys(modelTokens)) tokens[key] += modelTokens[key];
    }

    if (typeof block.total_cost_usd === 'number') {
      costUsd += block.total_cost_usd;
      hasCost = true;
    } else if (blockCostFromModels > 0) {
      costUsd += blockCostFromModels;
      hasCost = true;
    }
  }

  return {
    tokens_available: tokensAvailable,
    tokens: tokensAvailable ? withTotal(tokens) : null,
    models: tokensAvailable ? models : null,
    cost_usd: hasCost ? roundCost(costUsd) : null,
    num_turns: numTurns,
    duration_ms: durationMs,
    is_error: isError,
    result_blocks: blocks.length,
  };
}

function roundCost(value) {
  return Math.round(value * 1e6) / 1e6;
}

function toJstDate(isoTimestamp) {
  return new Date(new Date(isoTimestamp).getTime() + JST_OFFSET_MS);
}

/** JST の暦月（例: 2026-09）。cron は UTC で回るため、集計側で明示的に JST へ寄せる。 */
export function monthKeyJst(isoTimestamp) {
  const d = toJstDate(isoTimestamp);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** JST 基準の ISO 週（月曜始まり、例: 2026-W38）。 */
export function weekKeyJst(isoTimestamp) {
  const d = toJstDate(isoTimestamp);
  // ISO 週は「その週の木曜日が属する年」で決まる。木曜日へ寄せてから年内の週番号を数える。
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayOfWeek = (thursday.getUTCDay() + 6) % 7; // 月曜=0
  thursday.setUTCDate(thursday.getUTCDate() - dayOfWeek + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayOfWeek + 3);
  const week = 1 + Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function emptyBucket(key) {
  return {
    key,
    runs: 0,
    measured_runs: 0,
    unmeasured_runs: 0,
    tokens: emptyTokens(),
    cost_usd: 0,
  };
}

function addToBucket(bucket, record) {
  bucket.runs += 1;
  if (record.tokens_available) {
    bucket.measured_runs += 1;
    for (const key of Object.keys(bucket.tokens)) bucket.tokens[key] += record.tokens?.[key] ?? 0;
  } else {
    bucket.unmeasured_runs += 1;
  }
  bucket.cost_usd = roundCost(bucket.cost_usd + (record.cost_usd ?? 0));
}

/** レコード群を keyOf が返すキーで集計する。キー昇順の配列を返す。 */
export function aggregateBy(records, keyOf) {
  const buckets = new Map();
  for (const record of records) {
    const key = keyOf(record);
    if (key == null) continue;
    if (!buckets.has(key)) buckets.set(key, emptyBucket(key));
    addToBucket(buckets.get(key), record);
  }
  return [...buckets.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** 直近 count 個分の月キー（JST、古い順）。データが無い月も 0 として並べるために使う。 */
export function recentMonthKeys(nowIso, count) {
  const now = toJstDate(nowIso);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** 直近 count 個分の週キー（JST、古い順）。 */
export function recentWeekKeys(nowIso, count) {
  const nowMs = new Date(nowIso).getTime();
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(weekKeyJst(new Date(nowMs - i * 7 * 24 * 60 * 60 * 1000).toISOString()));
  }
  return keys;
}

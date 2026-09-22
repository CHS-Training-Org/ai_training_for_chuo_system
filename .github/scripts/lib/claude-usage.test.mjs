// claude-usage.mjs のパース・集計のテスト（`node --test .github/scripts/lib/` で実行）。
// フィクスチャは claude.yml の実ログから写した形（タイムスタンプ接頭辞・pretty-print・終端マーカー）。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateBy,
  extractResultBlocks,
  monthKeyJst,
  recentMonthKeys,
  summarizeResultBlocks,
  weekKeyJst,
} from './claude-usage.mjs';

/** 各行へ実ログと同じ ISO タイムスタンプ接頭辞を付ける。 */
function withTimestamps(text) {
  return text
    .split('\n')
    .map((line) => `2026-09-18T10:10:21.5981326Z ${line}`)
    .join('\n');
}

const LOG_SAVED = 'Log saved to /home/runner/work/_temp/claude-execution-output.json';

// show_full_output: true のジョブ（claude-review）。トークンはモデル別の modelUsage 配下に入る。
const FULL_OUTPUT_LOG = withTimestamps(`##[group]Run Claude Code Review
SDK options: {
  "model": "claude-opus-5"
}
##[endgroup]
{
  "modelUsage": {
    "claude-haiku-4-5-20251001": {
      "inputTokens": 100,
      "outputTokens": 20,
      "cacheReadInputTokens": 5,
      "cacheCreationInputTokens": 0,
      "thinkingTokens": 0,
      "costUSD": 0.001,
      "canonicalModel": "claude-haiku-4-5"
    },
    "claude-opus-5": {
      "inputTokens": 900,
      "outputTokens": 380,
      "cacheReadInputTokens": 45,
      "cacheCreationInputTokens": 10,
      "thinkingTokens": 7,
      "costUSD": 0.7699,
      "canonicalModel": "claude-opus-5"
    }
  },
  "is_error": false,
  "num_turns": 28,
  "type": "result",
  "duration_ms": 420060
}
${LOG_SAVED}
##[end-action id=__anthropics_claude-code-action.run;outcome=success]`);

// show_full_output なしのジョブ（claude）。トークン数は秘匿され、コストだけが残る。
const SANITIZED_LOG = withTimestamps(`Running Claude Code via SDK (full output hidden for security)
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 255000,
  "num_turns": 14,
  "total_cost_usd": 0.4242,
  "permission_denials_count": 0
}
${LOG_SAVED}`);

// 現行 action の秘匿版は modelUsage を持つが、トークン数は落としてある。
const SANITIZED_WITH_MODEL_USAGE_LOG = withTimestamps(`{
  "type": "result",
  "duration_ms": 1000,
  "num_turns": 2,
  "total_cost_usd": 0.05,
  "modelUsage": {
    "claude-opus-5": {
      "contextWindow": 1000000,
      "maxOutputTokens": 64000
    }
  }
}
${LOG_SAVED}`);

const NO_RESULT_LOG = withTimestamps(`No trigger was met for @claude
Trigger result: false
No trigger found, skipping remaining steps`);

test('full output のログからモデル横断でトークンを合算する', () => {
  const blocks = extractResultBlocks(FULL_OUTPUT_LOG);
  assert.equal(blocks.length, 1);

  const summary = summarizeResultBlocks(blocks);
  assert.equal(summary.tokens_available, true);
  assert.equal(summary.tokens.input, 1000);
  assert.equal(summary.tokens.output, 400);
  assert.equal(summary.tokens.cache_read, 50);
  assert.equal(summary.tokens.cache_creation, 10);
  assert.equal(summary.tokens.thinking, 7);
  // total は thinking を含まない（thinking は output の内数のため）。
  assert.equal(summary.tokens.total, 1460);
  assert.equal(summary.cost_usd, 0.7709);
  assert.equal(summary.num_turns, 28);
  assert.equal(Object.keys(summary.models).length, 2);
  assert.equal(summary.models['claude-opus-5'].total, 1335);
});

test('秘匿版のログはコストだけを記録しトークン未計測とする', () => {
  const summary = summarizeResultBlocks(extractResultBlocks(SANITIZED_LOG));
  assert.equal(summary.tokens_available, false);
  assert.equal(summary.tokens, null);
  assert.equal(summary.models, null);
  assert.equal(summary.cost_usd, 0.4242);
  assert.equal(summary.num_turns, 14);
});

test('トークン数を持たない modelUsage は計測済みとみなさない', () => {
  const summary = summarizeResultBlocks(extractResultBlocks(SANITIZED_WITH_MODEL_USAGE_LOG));
  assert.equal(summary.tokens_available, false);
  assert.equal(summary.cost_usd, 0.05);
});

test('Claude が起動しなかったログからは結果ブロックを取り出さない', () => {
  assert.deepEqual(extractResultBlocks(NO_RESULT_LOG), []);
  const summary = summarizeResultBlocks([]);
  assert.equal(summary.tokens_available, false);
  assert.equal(summary.cost_usd, null);
});

test('結果ブロックが複数あるログは合算する', () => {
  const summary = summarizeResultBlocks(extractResultBlocks(`${FULL_OUTPUT_LOG}\n${SANITIZED_LOG}`));
  assert.equal(summary.result_blocks, 2);
  assert.equal(summary.tokens.total, 1460);
  assert.equal(summary.cost_usd, 1.1951);
  assert.equal(summary.num_turns, 42);
});

test('週・月の区切りは JST で判定する', () => {
  // UTC では 9/20（日曜・W38）だが、JST では 9/21（月曜）なので W39 の扱いになる。
  assert.equal(weekKeyJst('2026-09-20T15:30:00Z'), '2026-W39');
  assert.equal(weekKeyJst('2026-09-20T14:30:00Z'), '2026-W38');
  // UTC では 9/30 だが JST では 10/1。
  assert.equal(monthKeyJst('2026-09-30T16:00:00Z'), '2026-10');
  assert.equal(monthKeyJst('2026-09-30T14:00:00Z'), '2026-09');
});

test('キー単位の集計で未計測の実行を区別する', () => {
  const records = [
    { month: '2026-09', tokens_available: true, tokens: { input: 10, output: 5, cache_read: 1, cache_creation: 0, thinking: 0, total: 16 }, cost_usd: 0.1 },
    { month: '2026-09', tokens_available: false, tokens: null, cost_usd: 0.2 },
    { month: '2026-08', tokens_available: true, tokens: { input: 1, output: 1, cache_read: 0, cache_creation: 0, thinking: 0, total: 2 }, cost_usd: 0.3 },
  ];
  const buckets = aggregateBy(records, (r) => r.month);

  assert.deepEqual(buckets.map((b) => b.key), ['2026-08', '2026-09']);
  const september = buckets[1];
  assert.equal(september.runs, 2);
  assert.equal(september.measured_runs, 1);
  assert.equal(september.unmeasured_runs, 1);
  assert.equal(september.tokens.total, 16);
  assert.equal(september.cost_usd, 0.3);
});

test('直近の月キーを年をまたいで並べる', () => {
  assert.deepEqual(recentMonthKeys('2026-02-15T00:00:00Z', 3), ['2025-12', '2026-01', '2026-02']);
});

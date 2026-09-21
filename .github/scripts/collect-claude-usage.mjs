// claude.yml の実行ログからトークン消費量・コストを収集し、JSONL へ追記・更新する
// （claude-usage-report.yml から実行）。
//
// GitHub Actions のログ保持期間は既定 90 日で、トークン数・コストはログ本文にしか存在しない
// （アーティファクトにも Job Summary にも残らない）。したがってこの JSONL が唯一の長期保存先であり、
// 消える前に毎週回収する必要がある。過去に遡っての再生成はできない。
//
// 冪等性: job_id をキーに upsert する。取得済みのジョブはログを再取得しない。
// 週次実行に対して収集窓を広めに取っているのは、1 回失敗しても次回で取り返せるようにするため。
//
// 環境変数:
//   GITHUB_REPOSITORY  owner/repo
//   GITHUB_TOKEN       Actions API 用（actions: read が必要）
//   DATA_FILE          出力先 JSONL のパス
//   SINCE              この日時以降に作成された実行を対象にする（ISO 8601）
//   WORKFLOW_FILE      対象ワークフローのファイル名（既定: claude.yml）
//   GITHUB_API_URL     API のベース URL（Actions が自動で設定する。既定: https://api.github.com）

import fs from 'node:fs';
import path from 'node:path';
import { extractResultBlocks, monthKeyJst, summarizeResultBlocks, weekKeyJst } from './lib/claude-usage.mjs';

const repo = requireEnv('GITHUB_REPOSITORY');
const token = requireEnv('GITHUB_TOKEN');
const dataFile = requireEnv('DATA_FILE');
const since = requireEnv('SINCE');
const workflowFile = process.env.WORKFLOW_FILE || 'claude.yml';
const apiBaseUrl = process.env.GITHUB_API_URL || 'https://api.github.com';

const SCHEMA_VERSION = 1;

const API_HEADERS = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が未設定です`);
  return value;
}

async function githubApi(pathname, searchParams = {}) {
  const url = new URL(`${apiBaseUrl}/repos/${repo}${pathname}`);
  for (const [key, value] of Object.entries(searchParams)) url.searchParams.set(key, value);

  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) throw new Error(`GitHub API failed: ${res.status} ${url.pathname} ${await res.text()}`);
  return res.json();
}

/** 対象ワークフローの実行一覧（since 以降）。 */
async function fetchRuns() {
  const runs = [];
  for (let page = 1; page <= 20; page++) {
    const body = await githubApi(`/actions/workflows/${workflowFile}/runs`, {
      per_page: '100',
      page: String(page),
      created: `>=${since}`,
    });
    const chunk = body.workflow_runs ?? [];
    runs.push(...chunk);
    if (chunk.length < 100) break;
  }
  return runs;
}

async function fetchJobs(runId) {
  const body = await githubApi(`/actions/runs/${runId}/jobs`, { per_page: '100', filter: 'latest' });
  return body.jobs ?? [];
}

/**
 * ジョブログの本文を取得する。
 * このエンドポイントは署名付き URL への 302 を返す。リダイレクト先へ Authorization を
 * 送ると拒否されるため、手動でリダイレクトを追って認証ヘッダを外す。
 */
async function fetchJobLog(jobId) {
  const res = await fetch(`${apiBaseUrl}/repos/${repo}/actions/jobs/${jobId}/logs`, {
    headers: API_HEADERS,
    redirect: 'manual',
  });

  if (res.status === 302 || res.status === 301 || res.status === 307) {
    const location = res.headers.get('location');
    if (!location) return { status: 'error', text: '' };
    const logRes = await fetch(location);
    if (!logRes.ok) return { status: 'error', text: '' };
    return { status: 'ok', text: await logRes.text() };
  }
  if (res.ok) return { status: 'ok', text: await res.text() };
  // 保持期間を過ぎたログは 410 / 404 になる。記録だけ残して二度と取りに行かない。
  if (res.status === 410 || res.status === 404) return { status: 'expired', text: '' };
  return { status: 'error', text: '' };
}

function readExistingRecords() {
  if (!fs.existsSync(dataFile)) return new Map();
  const records = new Map();
  for (const line of fs.readFileSync(dataFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    records.set(record.job_id, record);
  }
  return records;
}

function writeRecords(records) {
  const sorted = [...records.values()].sort(
    (a, b) => new Date(a.started_at) - new Date(b.started_at) || a.job_id - b.job_id,
  );
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, sorted.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return sorted.length;
}

function buildRecord(run, job, log) {
  const startedAt = job.started_at ?? run.run_started_at ?? run.created_at;
  const blocks = log.status === 'ok' ? extractResultBlocks(log.text) : [];
  const summary = summarizeResultBlocks(blocks);
  const logStatus = log.status === 'ok' ? (blocks.length > 0 ? 'parsed' : 'no-result') : log.status;

  return {
    schema_version: SCHEMA_VERSION,
    job_id: job.id,
    run_id: run.id,
    run_number: run.run_number,
    run_attempt: job.run_attempt ?? run.run_attempt,
    workflow_file: workflowFile,
    job_name: job.name,
    event: run.event,
    // 実行者 = @claude を書き込んだ人（issues イベントでは Issue の起票者・担当設定者）。
    actor: run.triggering_actor?.login ?? run.actor?.login ?? null,
    started_at: startedAt,
    week: weekKeyJst(startedAt),
    month: monthKeyJst(startedAt),
    conclusion: job.conclusion,
    html_url: job.html_url,
    log_status: logStatus,
    // Claude が実際に起動したか。トリガ条件に一致しても「No trigger was met」で終わる実行があるため、
    // 集計対象はこれが true のものに限る。
    claude_ran: logStatus === 'parsed',
    ...summary,
  };
}

async function main() {
  const records = readExistingRecords();
  const runs = await fetchRuns();
  let fetched = 0;
  let skipped = 0;

  for (const run of runs) {
    const jobs = await fetchJobs(run.id);
    for (const job of jobs) {
      if (job.conclusion === 'skipped') continue;
      // 実行中のジョブはログがまだ完結していない。ここで記録すると結果ブロック無しで
      // 確定してしまい、以後スキップされて消費量が永久に失われるため次回へ回す。
      if (job.status !== 'completed') continue;

      const existing = records.get(job.id);
      // 取得済みでも、一時的な失敗（API エラー）で終わったものは次回に取り直す。
      // ログが消える前に回収し直せる唯一の機会になる（保持期間切れの expired は対象外）。
      if (existing && existing.log_status !== 'error') {
        skipped += 1;
        continue;
      }
      const log = await fetchJobLog(job.id);
      records.set(job.id, buildRecord(run, job, log));
      fetched += 1;
    }
  }

  const total = writeRecords(records);
  console.log(
    `収集完了: 対象実行 ${runs.length} 件 / 新規取得 ${fetched} ジョブ / 取得済みスキップ ${skipped} ジョブ / 保持レコード ${total} 件`,
  );
}

await main();

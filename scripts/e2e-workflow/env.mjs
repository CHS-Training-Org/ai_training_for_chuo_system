#!/usr/bin/env node
/**
 * 結合テストのワークフローのテストを流すための環境を整える（案内スキル e2e-workflow が使う）。
 *
 * 生成したテストは、結合テスト専用のデータベース（bookflow_e2e）につないだバックエンドで流す。
 * このスクリプトは、専用のデータベースを用意し、バックエンドをそこにつないで起動する。
 * フロントエンドの開発サーバーは、Playwright の設定（webServer）が起動する。
 *
 * 使い方:
 *   node scripts/e2e-workflow/env.mjs up            専用のデータベースを用意し、バックエンドを起動して応答を待つ
 *   node scripts/e2e-workflow/env.mjs up --replace  動いている開発用のバックエンドを止めてから起動する
 *   node scripts/e2e-workflow/env.mjs down          このスクリプトが起動したバックエンドを止める
 *   node scripts/e2e-workflow/env.mjs status        今の状態を表示する
 *
 * 開発用のバックエンドがポート 8080 で動いているときは、--replace なしでは止めずに終わる。
 * 学習者が手で動かしているバックエンドを黙って止めないためである。
 *
 * 起動したバックエンドのプロセス番号は .tmp/e2e-workflow/backend.pid に残し、止めるときはその番号を使う。
 * コマンドの文字列で探して止めると、同じ文字列を含む別のプロセス（呼び出し元のシェルなど）まで止めることがあるためである。
 * 開発用のバックエンドを --replace で止めるときだけは、Java のプロセスをコマンドの文字列で探す。
 * そのときも、このスクリプト自身とその親のプロセスは対象から外す。
 *
 * メモリの少ない devcontainer で、バックエンド、開発サーバー、ブラウザを同時に動かすと落ちたことがあるため、
 * JAVA_TOOL_OPTIONS が設定されていなければ、Java のヒープの上限を 768MB にする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDatabase, E2E_DATABASE } from './db.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORK_DIR = path.join(REPO_ROOT, '.tmp', 'e2e-workflow');
const PID_FILE = path.join(WORK_DIR, 'backend.pid');
const LOG_FILE = path.join(WORK_DIR, 'backend.log');
const BACKEND_URL = 'http://localhost:8080/api/resources';
const E2E_DB_URL = `jdbc:postgresql://postgres:5432/${E2E_DATABASE}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** バックエンドが応答するか。認証が要る API なので、401 でも動いているとみなす。 */
async function responding() {
  try {
    const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(3000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ownPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
    return pid && alive(pid) ? pid : null;
  } catch {
    return null;
  }
}

/** このプロセスとその親たち。止める対象から外す。 */
function ancestors() {
  const out = new Set();
  let pid = process.pid;
  while (pid > 1 && !out.has(pid)) {
    out.add(pid);
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      pid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
    } catch {
      break;
    }
  }
  return out;
}

/** 動いているバックエンド（Gradle の bootRun と Spring Boot の Java）のプロセス番号。 */
function backendPids() {
  const skip = ancestors();
  const out = [];
  for (const name of fs.readdirSync('/proc')) {
    const pid = Number(name);
    if (!pid || skip.has(pid)) continue;
    let cmd = '';
    try {
      cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ');
    } catch {
      continue;
    }
    // bootRun の Gradle と、それが起動した Spring Boot だけを対象にする（ほかの Gradle の作業は止めない）
    if (/^\S*java\s/.test(cmd) && (/GradleWrapperMain.*\bbootRun\b/.test(cmd) || /BookflowApplication/.test(cmd))) out.push(pid);
  }
  return out;
}

async function waitStopped(timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (!(await responding())) return true;
    await sleep(1000);
  }
  return false;
}

async function up(replace) {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  const created = createDatabase();
  console.log(created ? `${E2E_DATABASE} を作りました` : `${E2E_DATABASE} はあります`);

  if (ownPid()) {
    for (let i = 0; i < 360 && !(await responding()); i++) await sleep(1000);
    if (await responding()) return console.log('結合テスト用のバックエンドは起動済みです');
    throw new Error(`結合テスト用のバックエンドが応答しません。ログを確かめてください：${path.relative(REPO_ROOT, LOG_FILE)}`);
  }
  if (await responding()) {
    if (!replace) {
      console.error('開発用のバックエンドがポート 8080 で動いています。結合テスト用のデータベースにつなぎ直すには、止めて起動し直す必要があります。');
      console.error('学習者に伝えてから、--replace を付けてもう一度実行してください。');
      process.exitCode = 2;
      return;
    }
    const pids = backendPids();
    if (!pids.length) throw new Error('ポート 8080 で動いているバックエンドのプロセスが見つかりません。手で止めてから、もう一度実行してください');
    for (const pid of pids) {
      try { process.kill(pid, 'SIGTERM'); } catch { /* すでに終わっている */ }
    }
    if (!(await waitStopped(60_000))) throw new Error('開発用のバックエンドが止まりません。手で止めてから、もう一度実行してください');
    console.log('開発用のバックエンドを止めました');
  }

  const out = fs.openSync(LOG_FILE, 'w');
  const child = spawn('./gradlew', ['bootRun', '--no-daemon'], {
    cwd: path.join(REPO_ROOT, 'backend'),
    env: { ...process.env, DB_URL: E2E_DB_URL, JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS || '-Xmx768m' },
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`結合テスト用のデータベースにつないでバックエンドを起動しています（ログ：${path.relative(REPO_ROOT, LOG_FILE)}）`);
  for (let i = 0; i < 360; i++) {
    if (await responding()) return console.log('バックエンドが応答しました');
    if (!alive(child.pid)) break;
    await sleep(1000);
  }
  const tail = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-20).join('\n');
  throw new Error(`バックエンドが起動しませんでした。ログの最後：\n${tail}`);
}

async function down() {
  const pid = ownPid();
  if (!pid) {
    fs.rmSync(PID_FILE, { force: true });
    return console.log('このスクリプトが起動したバックエンドは動いていません');
  }
  // 起動したときにプロセスグループを分けているので、グループごと止める（Gradle と、その子の Java）
  try { process.kill(-pid, 'SIGTERM'); } catch { process.kill(pid, 'SIGTERM'); }
  await waitStopped(60_000);
  fs.rmSync(PID_FILE, { force: true });
  console.log('結合テスト用のバックエンドを止めました。開発に戻るときは cd backend && ./gradlew bootRun で起動し直してください');
}

async function status() {
  const pid = ownPid();
  console.log(`バックエンド：${(await responding()) ? '応答あり' : '応答なし'}（${pid ? `結合テスト用、プロセス ${pid}` : 'このスクリプトが起動したものではない'}）`);
}

try {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'up') await up(rest.includes('--replace'));
  else if (cmd === 'down') await down();
  else if (cmd === 'status') await status();
  else throw new Error('使い方: node scripts/e2e-workflow/env.mjs up [--replace] | down | status');
} catch (e) {
  console.error(`エラー: ${e.message}`);
  process.exitCode = 1;
}

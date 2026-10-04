#!/usr/bin/env node
/**
 * 結合テストのワークフローで生成したテストを実行し、実行の証拠を集める。
 *
 * 学習者はテストコードを読まずに、ここで集めた証拠（見る場所の画面、フェイルした時点の画面、このテストで使った値）を
 * 試験ケースの期待結果と並べて見て、期待結果が本当に成り立っていたかを判断する。証拠は Playwright の
 * 実行結果から機械的に集め、AI の説明は混ぜない。
 *
 * 使い方:
 *   node scripts/e2e-workflow/run.mjs <スラッグ>
 *
 * 出力:
 *   - Docs/test/<スラッグ>/run.json  ケースごとの結果、証拠の画面のファイル名、使った値、実行したときのテストコードの指紋
 *   - frontend/playwright/evidence/<スラッグ>/  証拠の画面（Git には入れない）
 *
 * 前提：結合テスト専用のデータベース（bookflow_e2e）があり、バックエンドがそこにつながって起動していること。
 * 準備は node scripts/e2e-workflow/env.mjs up で行う。流す前に、このスクリプトがデータベースを初期データに戻す。
 * フロントエンドは Playwright の設定が起動する。
 *
 * 状態ファイルは変えない。案内スキル（e2e-workflow）が、フェイルしたケースの見立て（triage.md）を書いたあとで、
 * テストコードと実行の段階を「レビュー待ち」にする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evidenceDir, readState, RESULT_KINDS, resultKind, runPath, specHash, specPath, triagePath, usesWorkflowTest } from './state.mjs';
import { resetDatabase } from './db.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRONTEND = path.join(REPO_ROOT, 'frontend');
const EVIDENCE_PREFIX = '証拠:';
const USED_VALUE_PREFIX = '使った値:';

function walk(suite, out = []) {
  for (const spec of suite.specs || []) out.push(spec);
  for (const child of suite.suites || []) walk(child, out);
  return out;
}

function firstLine(text) {
  return String(text || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').map((l) => l.trim()).find(Boolean) || '';
}

/**
 * Playwright のエラー1件を、学習者に見せる形にする。
 * expect に説明（第2引数）を添えると、1行目がその説明になり、「expect(...).toX(...) failed」は2行目以降に来る。
 * そのため、期待結果の確かめでフェイルしたか（assert）は、メッセージ全体で見分ける。
 * 期待した値と実際の値（Expected と Received の行）があれば、あわせて残す。
 */
function errorInfo(e) {
  const text = String(e?.message || '').replace(/\x1b\[[0-9;]*m/g, '');
  const line = (re) => (text.match(re) || [])[1]?.trim() || '';
  return {
    message: firstLine(text).replace(/^Error:\s*/, ''),
    assert: /^\s*(?:Error:\s*)?expect(\.soft)?\(.*\)\.[\w.]+\(.*\) failed\s*$/m.test(text),
    expected: line(/^Expected(?: [\w ]+)?:\s*(.+)$/m),
    received: line(/^Received(?: [\w ]+)?:\s*(.+)$/m),
  };
}

function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('使い方: node scripts/e2e-workflow/run.mjs <スラッグ>');
  const state = readState(slug);
  if (!state) throw new Error(`状態ファイルがありません: ${slug}`);
  // 確定したテストコードを流し、確定した実行の結果は上書きしない
  if (state.stages.cases.status !== 'confirmed') throw new Error('試験ケースの段階が確定していません。確定してから実行してください');
  if (state.stages.code.status === 'confirmed') throw new Error('テストコードと実行の段階は確定済みです。確定した証拠は上書きしません');
  // 置き場所を変えたテストコードは、Playwright の設定（tests/e2e/workflow/）と import の位置に合わず流せない
  if (process.env.E2E_WORKFLOW_SPEC_DIR) throw new Error('E2E_WORKFLOW_SPEC_DIR は確認用のダッシュボードのための設定で、実行では使えません。外してから実行してください');
  const spec = specPath(slug);
  if (!fs.existsSync(spec)) throw new Error(`テストコードがありません: ${spec}`);
  // 初期化しないテストを流すと、ほかのテストのデータが証拠の画面に写り、学習者が判断できなくなる
  if (!usesWorkflowTest(fs.readFileSync(spec, 'utf8'))) {
    throw new Error('テストコードが、テストごとにデータベースを初期データに戻す test（helpers/workflow-test）を使っていません。テストコードの段階に戻して直してください');
  }

  // 前回の結果は先に消す。実行中や、実行が途中で失敗したあとに、画像のない古い結果を確定できないようにする
  // 見立て（triage.md）も前回の結果へのものなので消す。流したあとで案内スキルが書き直す
  fs.rmSync(runPath(slug), { force: true });
  fs.rmSync(triagePath(slug), { force: true });
  const dir = evidenceDir(slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const report = path.join(dir, 'report.json');
  const runId = Date.now().toString(36);
  const hash = specHash(slug);

  // ログインの準備（setup）は、テストごとの初期化より前に動き、初期データのユーザーが要る。
  // 専用のデータベースを作った直後は表しかないので、流す前に一度初期データに戻す
  try {
    resetDatabase();
  } catch (e) {
    throw new Error(`結合テスト用のデータベースを初期データに戻せませんでした。${e.message}`);
  }

  // Playwright を直接呼ぶ（pnpm を通さない）。結果は JSON で受け取り、進み具合は画面に出す
  const bin = path.join(FRONTEND, 'node_modules', '.bin', 'playwright');
  const res = spawnSync(bin, ['test', '--project=workflow', path.relative(FRONTEND, spec), '--reporter=line,json'], {
    cwd: FRONTEND,
    stdio: 'inherit',
    env: { ...process.env, E2E_WORKFLOW: '1', E2E_RUN_ID: runId, PLAYWRIGHT_JSON_OUTPUT_NAME: report },
  });
  if (!fs.existsSync(report)) throw new Error(`実行結果（${report}）ができませんでした。Playwright の出力を確かめてください`);

  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const cases = {};
  for (const s of walk({ suites: json.suites })) {
    const id = (s.title.match(/^([A-Z][A-Z0-9-]*-TC-\d{3})/) || [])[1];
    if (!id) continue;
    const t = (s.tests || [])[0];
    const result = t && t.results && t.results[t.results.length - 1];
    if (!result) { cases[id] = { status: 'not_run', title: s.title, evidence: [], values: [] }; continue; }
    const evidence = [];
    // 同じ名前の値を2回残したテストは、あとの値を使う
    const used = new Map();
    let n = 0;
    for (const a of result.attachments || []) {
      if (a.name.startsWith(USED_VALUE_PREFIX)) {
        const text = a.body ? Buffer.from(a.body, 'base64').toString('utf8') : a.path && fs.existsSync(a.path) ? fs.readFileSync(a.path, 'utf8') : '';
        used.set(a.name.slice(USED_VALUE_PREFIX.length), text);
        continue;
      }
      const isEvidence = a.name.startsWith(EVIDENCE_PREFIX);
      const isFailure = a.name === 'screenshot';
      if (!isEvidence && !isFailure) continue;
      // テストの中で撮った画面は、実行結果のファイルに埋め込まれて届くことがある（body）。自動で撮った画面はファイル（path）で届く
      const file = `${id}-${++n}.png`;
      if (a.body) fs.writeFileSync(path.join(dir, file), Buffer.from(a.body, 'base64'));
      else if (a.path && fs.existsSync(a.path)) fs.copyFileSync(a.path, path.join(dir, file));
      else { n--; continue; }
      evidence.push({ kind: isEvidence ? 'evidence' : 'failure', label: isEvidence ? a.name.slice(EVIDENCE_PREFIX.length) : 'フェイルした時点の画面', file });
    }
    const passed = result.status === 'passed';
    // expect.soft で確かめた期待結果は、フェイルしてもテストが先へ進むので、エラーが複数になることがある。順に残す
    const errors = passed ? [] : (result.errors?.length ? result.errors : [result.error]).map(errorInfo).filter((e) => e.message);
    cases[id] = {
      status: passed ? 'passed' : result.status === 'skipped' ? 'not_run' : 'failed',
      title: s.title,
      durationMs: result.duration,
      error: errors.map((e) => e.message).join(' ／ '),
      errors,
      evidence,
      values: [...used].map(([label, value]) => ({ label, value })),
    };
  }
  const values = Object.values(cases);
  if (res.status !== 0 && values.length === 0) {
    throw new Error('テストが1件も実行されませんでした。ログインの準備などが失敗していないか、Playwright の出力を確かめてください');
  }
  const out = {
    runAt: new Date().toISOString(),
    runId,
    specHash: hash,
    exitCode: res.status,
    totals: {
      tests: values.length,
      passed: values.filter((c) => c.status === 'passed').length,
      failed: values.filter((c) => c.status === 'failed').length,
      byKind: Object.fromEntries(RESULT_KINDS.map((k) => [k.key, values.filter((c) => resultKind(c) === k.key).length])),
    },
    cases,
  };
  // 実行している間に確定された場合は、確定した状態を上書きしない
  if (readState(slug).stages.code.status === 'confirmed') throw new Error('流している間に、テストコードと実行の段階が確定されました。結果は書き込みません');
  fs.writeFileSync(runPath(slug), JSON.stringify(out, null, 2) + '\n');
  const fails = RESULT_KINDS.filter((k) => k.fail && out.totals.byKind[k.key]).map((k) => `${k.label} ${out.totals.byKind[k.key]}`);
  console.log(`集めた結果: テスト ${out.totals.tests} 件、パス ${out.totals.passed} 件、フェイル ${out.totals.failed} 件${fails.length ? `（${fails.join('、')}）` : ''}`);
  console.log(`保存先: ${path.relative(REPO_ROOT, runPath(slug))}、${path.relative(REPO_ROOT, dir)}/`);
  if (out.totals.failed) console.log(`次に、フェイルした ${out.totals.failed} 件の見立てを ${path.relative(REPO_ROOT, triagePath(slug))} に書く（実行の ID: ${runId}）`);
}

try {
  main();
} catch (e) {
  console.error(`エラー: ${e.message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node
/**
 * 結合テストのワークフローの状態ファイル（Docs/test/<スラッグ>/state.json）を読み書きする。
 *
 * 状態ファイルを書き換える処理はこのファイルに集める。案内スキル（e2e-workflow）と
 * ダッシュボード（server.mjs）は、どちらもこのファイルを通して状態を扱う。
 *
 * CLI（案内スキルが使う）で行えるのは、状態ファイルの作成、表示、「レビュー待ち」への更新だけ。
 * 「確定」と「差し戻し」、仕様の矛盾への回答、フェイルしたケースの判断は、ダッシュボードの画面操作（server.mjs）からだけ行う。
 * 確定した段階を差し戻しに戻す reopen は、学習者が前の段階の誤りを見つけ、戻すと決めたときに、案内スキルが学習者の依頼で使う。
 * ただしこれは構成上の分担で、AI が state.json を直接書き換えることまでは防げない。
 *
 * 使い方:
 *   node scripts/e2e-workflow/state.mjs init <スラッグ> <画面パス>
 *   node scripts/e2e-workflow/state.mjs show <スラッグ>
 *   node scripts/e2e-workflow/state.mjs ai-output <スラッグ> <段階> [メモ]
 *   node scripts/e2e-workflow/state.mjs last-return <スラッグ> <段階>
 *   node scripts/e2e-workflow/state.mjs validate <スラッグ>
 *   node scripts/e2e-workflow/state.mjs reopen <スラッグ> <段階> <理由>   （学習者の依頼で案内スキルが使う）
 *
 * 対象ディレクトリは既定で <リポジトリ>/Docs/test。環境変数 E2E_WORKFLOW_DIR で変えられる。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const STAGES = [
  { key: 'perspectives', label: '1 試験観点', gate: '関門1 観点の確定', artifact: 'perspectives.md', guide: 'docs-next/docs/develop/integration-test/viewpoints.md' },
  { key: 'cases', label: '2 試験仕様書', gate: '関門2 試験仕様書の確定', artifact: 'cases.md', guide: 'docs-next/docs/develop/integration-test/cases.md' },
  // テストコードを作り、流してエビデンスを集めるまでを1つの段階にする。学習者はテストコードを読まず、説明（code.md）の判断と
  // 実行のエビデンスで確定する。実行の結果（run.json）と AI の見立て（triage.md）は、この段階の成果物として扱う
  { key: 'code', label: '3 テストコードと実行', gate: '関門3 テストの確定', artifact: 'code.md', guide: 'docs-next/docs/develop/integration-test/execution.md' },
];

export const STATUS = {
  not_started: '未着手',
  ai_output: 'レビュー待ち',
  returned: '差し戻し',
  confirmed: '確定',
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function baseDir() {
  return process.env.E2E_WORKFLOW_DIR
    ? path.resolve(process.env.E2E_WORKFLOW_DIR)
    : path.join(REPO_ROOT, 'Docs', 'test');
}

function assertSlug(slug) {
  if (!SLUG_RE.test(slug || '')) throw new Error(`スラッグの形式が不正です: ${slug}`);
}

export function statePath(slug) {
  assertSlug(slug);
  return path.join(baseDir(), slug, 'state.json');
}

/** 実行の結果（run.mjs が書く）。 */
export function runPath(slug) {
  assertSlug(slug);
  return path.join(baseDir(), slug, 'run.json');
}

/** フェイルしたケースへの AI の見立て（案内スキルが書く）。 */
export function triagePath(slug) {
  assertSlug(slug);
  return path.join(baseDir(), slug, 'triage.md');
}

export function artifactPath(slug, stageKey) {
  const stage = STAGES.find((s) => s.key === stageKey);
  if (!stage || !stage.artifact) return null;
  return path.join(baseDir(), slug, stage.artifact);
}

function now() {
  return new Date().toISOString();
}

const TIME_FORMAT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** 記録の日時（ISO 8601、UTC）を日本時間の「2026/09/27 14:05」の形で表示する。 */
export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : TIME_FORMAT.format(d);
}

/**
 * 観点一覧の 4.1「仕様の矛盾」の表を読む。
 * 選択肢は「A. <案>／B. <案>」の形で書かれている前提（generate-test-perspectives の出力様式）。
 */
export function parseDiscrepancies(md) {
  const start = md.search(/^### 4\.1 /m);
  if (start < 0) return [];
  const rest = md.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^#{2,3} /.test(l));
  const lines = (end < 0 ? rest : rest.slice(0, end)).filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const col = (name) => head.findIndex((h) => h.startsWith(name));
  const [iId, iQ, iC, iImpact, iAns] = [col('ID'), col('質問'), col('回答の選択肢'), col('影響する観点'), head.lastIndexOf('回答')];
  return lines.slice(2).map(cells).filter((c) => c[iId]).map((c) => ({
    id: c[iId],
    question: c[iQ] || '',
    impact: iImpact >= 0 ? c[iImpact] || '' : '',
    reflected: iAns >= 0 ? c[iAns] || '' : '',
    choices: (c[iC] || '').split(/／(?=[A-Z][.．]\s*)/).map((x) => x.trim().match(/^([A-Z])[.．]\s*(.*)$/)).filter(Boolean).map((m) => ({ key: m[1], text: m[2] })),
  }));
}

/** 保存した回答が観点一覧の「回答」列に反映されているか（列の先頭の記号が回答と一致するか）。 */
export function isReflected(q, saved) {
  const m = (q.reflected || '').match(/^([A-Z])[.．]/);
  return Boolean(saved?.[q.id] && m && m[1] === saved[q.id].choice);
}

/** Markdown の「## <n>. 」で始まる章の本文を取り出す。 */
export function chapter(md, n) {
  const start = md.search(new RegExp(`^## ${n}\\. `, 'm'));
  if (start < 0) return '';
  const rest = md.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** 表の行（見出しと区切りを除く）をセルの配列にする。 */
export function tableRows(text) {
  const out = [];
  let head = null;
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) { head = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (/^:?-+/.test(cells[0] || '')) continue;
    if (!head) { head = cells; continue; }
    out.push(Object.fromEntries(head.map((h, i) => [h, cells[i] || ''])));
  }
  return out;
}

const VP_RE = /[A-Z][A-Z0-9-]*-VP-\d{3}/g;

/**
 * 観点一覧の2章の観点が、試験仕様書のどこかに載っているかを照らし合わせる。
 * 載っている場所は、試験ケースの「展開元」か、4章「試験ケースにできなかった観点」のどちらか。
 */
export function casesCoverage(perspectivesMd, casesMd) {
  const vps = [...new Set((chapter(perspectivesMd, 2).match(VP_RE) || []).filter((id) => tableRows(chapter(perspectivesMd, 2)).some((r) => r.ID === id)))];
  const cases = tableRows(chapter(casesMd, 2)).filter((r) => /-TC-\d{3}$/.test(r.ID || ''));
  const expanded = new Set(cases.flatMap((r) => (r['展開元'] || '').match(VP_RE) || []));
  const unexpanded = new Set(tableRows(chapter(casesMd, 4)).flatMap((r) => (r['観点 ID'] || '').match(VP_RE) || []));
  return {
    viewpoints: vps.length,
    cases: cases.length,
    expanded: vps.filter((id) => expanded.has(id)).length,
    unexpanded: [...unexpanded].filter((id) => vps.includes(id)),
    missing: vps.filter((id) => !expanded.has(id) && !unexpanded.has(id)),
    unknown: [...expanded, ...unexpanded].filter((id) => !vps.includes(id)),
  };
}

export function coverageOf(slug) {
  const pp = artifactPath(slug, 'perspectives');
  const cp = artifactPath(slug, 'cases');
  if (!pp || !cp || !fs.existsSync(pp) || !fs.existsSync(cp)) return null;
  return casesCoverage(fs.readFileSync(pp, 'utf8'), fs.readFileSync(cp, 'utf8'));
}

/** 生成したテストコードの置き場所。学習者の成果物で、普段の pnpm test:e2e には含まれない。 */
export function specPath(slug) {
  assertSlug(slug);
  // 確認用のダッシュボードなどで、本物の作業ツリー以外を見せたいときは E2E_WORKFLOW_SPEC_DIR で変えられる
  const dir = process.env.E2E_WORKFLOW_SPEC_DIR ? path.resolve(process.env.E2E_WORKFLOW_SPEC_DIR) : path.join(REPO_ROOT, 'frontend', 'tests', 'e2e', 'workflow');
  return path.join(dir, `${slug}.spec.ts`);
}

/** 実行のエビデンスの画面の置き場所。Git には入れない。E2E_WORKFLOW_EVIDENCE_DIR で変えられる。 */
export function evidenceDir(slug) {
  assertSlug(slug);
  const dir = process.env.E2E_WORKFLOW_EVIDENCE_DIR ? path.resolve(process.env.E2E_WORKFLOW_EVIDENCE_DIR) : path.join(REPO_ROOT, 'frontend', 'playwright', 'evidence');
  return path.join(dir, slug);
}

/**
 * 実行の結果の区分。テストがどこで止まったかを、Playwright のエラーとエビデンスの画面の有無から機械的に決める。
 * 実装の不具合かテストの誤りかは、ここでは決めない（人が画面を見て判断する）。
 */
export const RESULT_KINDS = [
  { key: 'pass', label: 'パス', fail: false, note: '最後まで期待結果どおりだった' },
  { key: 'assert', label: '期待結果と違った', fail: true, note: '確認箇所までたどり着き、期待結果を確かめたところでフェイルした。確認箇所の画面で、期待結果と何が違うかを見る' },
  { key: 'stopped', label: '途中で止まった', fail: true, note: '確認箇所にたどり着く前に、手順の途中でフェイルした（画面の要素が見つからない、画面が移らない、時間切れなど）。フェイルした時点の画面で、どこで止まったかを見る' },
  { key: 'setup', label: '前提データを用意できなかった', fail: true, note: 'テストの前提になるデータ（既存の予約など）を API で作れなかった' },
  { key: 'env', label: '環境が整っていない', fail: true, note: 'バックエンドやデータベースにつながらなかった。AI が環境を整えて流し直す。残っている間は、学習者に渡せず、確定もできない' },
  { key: 'not_run', label: '実行されていない', fail: false, note: 'テストが実行されなかった' },
];

const ENV_ERROR = /ERR_CONNECTION_REFUSED|ECONNREFUSED|bookflow_e2e|postgres のコンテナ|表がありません|playwright\/\.auth/;
const SETUP_ERROR = /に失敗した（\d+）|条件に合う有効なリソースが初期データにない|承認待ちのステップが見つからない|後片付けの印（/;

/** run.json の1ケースの結果の区分（RESULT_KINDS の key）。 */
export function resultKind(c) {
  if (!c || c.status === 'not_run') return 'not_run';
  if (c.status === 'passed') return 'pass';
  const err = c.error || '';
  if (ENV_ERROR.test(err)) return 'env';
  if (SETUP_ERROR.test(err)) return 'setup';
  const reached = (c.evidence || []).some((e) => e.kind === 'evidence');
  // expect.soft のフェイルのあとで止まったテストは、最後のエラーで分ける（最後まで進めたかどうか）。
  // run.mjs はエラーごとに、期待結果の確かめでフェイルしたか（assert）を残す。以前の run.json は文字列だけを持つ
  const last = (c.errors || []).at(-1);
  const isAssert = last && typeof last === 'object' ? last.assert : /expect\(/.test(last || err);
  return reached && isAssert ? 'assert' : 'stopped';
}

/**
 * テストコードの文字列を、文字列リテラルとコメントを読み飛ばしながら1文字ずつ見る小さな走査器。
 * テストの範囲（test( の対応する閉じ括弧まで）と、expect の呼び出しを抜き出すのに使う。
 */
function skipString(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = matchClose(src, j + 1) ; continue; }
    if (src[j] === q) return j;
  }
  return src.length - 1;
}

function skipComment(src, i) {
  if (src[i + 1] === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length - 1 : e; }
  const e = src.indexOf('*/', i + 2);
  return e < 0 ? src.length - 1 : e + 1;
}

/** src[open] の括弧（( [ {）に対応する閉じ括弧の位置。 */
function matchClose(src, open) {
  const pair = { '(': ')', '[': ']', '{': '}' };
  const stack = [pair[src[open]]];
  for (let i = open + 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(src, i); continue; }
    if (ch === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) { i = skipComment(src, i); continue; }
    if (pair[ch]) stack.push(pair[ch]);
    else if (ch === stack[stack.length - 1]) { stack.pop(); if (!stack.length) return i; }
  }
  return src.length - 1;
}

/** 括弧の中身を、いちばん外側のカンマで分ける。 */
function splitArgs(inner) {
  const out = [];
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(inner, i); continue; }
    if (ch === '(' || ch === '[' || ch === '{') { i = matchClose(inner, i); continue; }
    if (ch === ',') { out.push(inner.slice(start, i).trim()); start = i + 1; }
  }
  const last = inner.slice(start).trim();
  if (last) out.push(last);
  return out;
}

/** 文字列リテラル（${} を含まないもの）なら、その中身。それ以外は null。 */
function literalString(arg) {
  const m = (arg || '').match(/^(["'`])([\s\S]*)\1$/);
  if (!m || (m[1] === '`' && m[2].includes('${'))) return null;
  return m[2].replace(/\\(.)/g, '$1');
}

/** 照合の種類を、学習者が読める言葉にする。値が文字列か数のリテラルでなければ「テストの中で決めた値」と書く。 */
const MATCHERS = {
  toBeVisible: () => '表示されている',
  toBeHidden: () => '表示されていない',
  toHaveCount: (v) => `件数が ${v}`,
  toHaveText: (v) => `文字が「${v}」と一致する`,
  toContainText: (v) => `「${v}」を含む`,
  toHaveValue: (v) => `入力値が「${v}」`,
  toHaveURL: (v) => `URL が ${v}`,
  toBeDisabled: () => '押せない（無効）',
  toBeEnabled: () => '押せる',
  toBeChecked: () => '選ばれている',
  toBeEmpty: () => '空である',
  toBeAttached: () => '画面の中にある',
  toHaveAttribute: (v, w) => `属性 ${v} が「${w}」`,
  toBe: (v) => `${v} と等しい`,
  toEqual: (v) => `${v} と等しい`,
  toBeTruthy: () => '真である',
  toBeNull: () => '値がない',
};

const NOT_MATCHERS = {
  toBeVisible: () => '表示されていない',
  toBeHidden: () => '表示されている',
  toHaveCount: (v) => `件数が ${v} ではない`,
  toContainText: (v) => `「${v}」を含まない`,
  toHaveText: (v) => `文字が「${v}」ではない`,
  toBeDisabled: () => '押せる',
  toBeEnabled: () => '押せない（無効）',
  toBeChecked: () => '選ばれていない',
};

function valueWord(arg) {
  if (arg === undefined) return '';
  const lit = literalString(arg);
  if (lit !== null) return lit;
  if (/^-?\d+(\.\d+)?$/.test(arg)) return arg;
  if (/^\/.*\/[a-z]*$/.test(arg)) return `パターン ${arg}`;
  return 'テストの中で決めた値';
}

/**
 * テストコードから、テストごとの「確かめたこと」を機械的に抜き出す。
 * 戻り値は { テスト名の先頭のケース ID: { checks: [{ message, check, soft, line }], evidence, line } }。
 * evidence は、そのテストが確認箇所の画面を撮っているか（evidence( を呼んでいるか）。
 * message は expect の第2引数（AI が書いた、何を確かめるかの説明）。文字列リテラルでなければ null。
 * check は照合の種類（機械的に決めた言葉）。テストの外（補助の関数）にある expect は対象にしない。
 */
export function specChecks(src) {
  const out = {};
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  const testRe = /\btest\s*\(\s*(["'`])([A-Z][A-Z0-9-]*-TC-\d{3})/g;
  let m;
  while ((m = testRe.exec(src))) {
    const open = src.indexOf('(', m.index);
    const close = matchClose(src, open);
    const body = src.slice(open, close + 1);
    const checks = [];
    // コメントと文字列の中の「expect」を拾わないように、それらを空白にした写しで探す（位置は元と同じ）
    let masked = '';
    for (let k = 0; k < body.length; k++) {
      const ch = body[k];
      const end = ch === '"' || ch === "'" || ch === '`' ? skipString(body, k)
        : ch === '/' && (body[k + 1] === '/' || body[k + 1] === '*') ? skipComment(body, k) : -1;
      if (end < 0) { masked += ch; continue; }
      masked += body.slice(k, end + 1).replace(/[^\n]/g, ' ');
      k = end;
    }
    const exRe = /\bexpect\b/g;
    let e;
    while ((e = exRe.exec(masked))) {
      let i = e.index + 'expect'.length;
      const ws = () => { while (/\s/.test(body[i] || '')) i++; };
      ws();
      let soft = false;
      if (body.startsWith('.soft', i)) { soft = true; i += 5; ws(); }
      if (body[i] !== '(') continue;
      const argsEnd = matchClose(body, i);
      const args = splitArgs(body.slice(i + 1, argsEnd));
      i = argsEnd + 1; ws();
      let not = false;
      if (body.startsWith('.not', i)) { not = true; i += 4; ws(); }
      const mm = body.slice(i).match(/^\.(\w+)\s*\(/);
      if (!mm) continue;
      const name = mm[1];
      const mOpen = i + mm[0].length - 1;
      const mArgs = splitArgs(body.slice(mOpen + 1, matchClose(body, mOpen)));
      const word = MATCHERS[name] ? MATCHERS[name](valueWord(mArgs[0]), valueWord(mArgs[1])) : name;
      const v = valueWord(mArgs[0]);
      const check = !not ? word : (NOT_MATCHERS[name] ? NOT_MATCHERS[name](v) : `「${word}」ではない`);
      checks.push({ message: args.length > 1 ? literalString(args[1]) : null, check, soft, line: lineAt(open + e.index) });
      exRe.lastIndex = argsEnd;
    }
    out[m[2]] = { checks, evidence: /\bevidence\s*\(/.test(masked), line: lineAt(m.index) };
    testRe.lastIndex = close;
  }
  return out;
}

/** 生成したテストが、テストごとにデータベースを初期データに戻す test（helpers/workflow-test）を使っているか。 */
export function usesWorkflowTest(src) {
  return /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*["']\.\.\/helpers\/workflow-test["']/.test(src);
}

/** 段階の成果物のファイル。確定したあとの書き換えを見分けるのに使う。 */
function stageFiles(slug, stageKey) {
  if (stageKey === 'code') return [artifactPath(slug, 'code'), specPath(slug), runPath(slug), triagePath(slug)];
  return [artifactPath(slug, stageKey)];
}

/** 段階の成果物の指紋。ファイルがなければ null。 */
export function stageFingerprint(slug, stageKey) {
  const files = stageFiles(slug, stageKey).filter((f) => f && fs.existsSync(f));
  if (!files.length) return null;
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(path.basename(f)).update('\0').update(fs.readFileSync(f)).update('\0');
  return h.digest('hex').slice(0, 16);
}

/** 確定したあとで成果物が書き換えられた段階（確定の時点の指紋がある段階だけを見る）。 */
export function changedAfterConfirm(state) {
  return STAGES.filter((s) => {
    const st = state.stages[s.key];
    return st && st.status === 'confirmed' && st.confirmed_hash && st.confirmed_hash !== stageFingerprint(state.slug, s.key);
  });
}

/** テストコードの指紋。実行した時点のテストコードと今のテストコードが同じかを見分ける。 */
export function specHash(slug) {
  const sp = specPath(slug);
  return fs.existsSync(sp) ? crypto.createHash('sha256').update(fs.readFileSync(sp)).digest('hex').slice(0, 16) : null;
}

const TC_RE = /[A-Z][A-Z0-9-]*-TC-\d{3}/g;

/** test.describe.skip / test.describe.fixme で止めたブロックの範囲（文字の位置）。中括弧の対応で決める。 */
function skippedDescribeRanges(src) {
  const ranges = [];
  for (const m of src.matchAll(/\bdescribe\.(?:skip|fixme)\(/g)) {
    const open = src.indexOf('{', src.indexOf('=>', m.index));
    if (open < 0) continue;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) { ranges.push([m.index, i]); break; }
    }
  }
  return ranges;
}

/**
 * 試験仕様書の2章のケースが、テストコードのどこかにあるかを照らし合わせる。
 * テスト名の先頭のケース ID で数える。test.skip / test.fixme で止めたテストと、
 * test.describe.skip / test.describe.fixme の中のテストは数えない。
 */
export function codeCoverage(casesMd, specSrc, codeMd) {
  const cases = tableRows(chapter(casesMd, 2)).map((r) => r.ID).filter((id) => /-TC-\d{3}$/.test(id || ''));
  const tested = new Set();
  const skipped = new Set();
  const off = skippedDescribeRanges(specSrc);
  const re = /\btest(?:\.(only|skip|fixme|fail))?\(\s*["'`]([A-Z][A-Z0-9-]*-TC-\d{3})/g;
  const seen = new Set();
  const duplicated = new Set();
  for (const m of specSrc.matchAll(re)) {
    const inSkipped = off.some(([a, b]) => m.index > a && m.index < b);
    if (seen.has(m[2])) duplicated.add(m[2]);
    seen.add(m[2]);
    (m[1] === 'skip' || m[1] === 'fixme' || inSkipped ? skipped : tested).add(m[2]);
  }
  const unwritten = new Set(tableRows(chapter(codeMd, 4)).flatMap((r) => (r['ケース ID'] || '').match(TC_RE) || []));
  return {
    cases: cases.length,
    tested: cases.filter((id) => tested.has(id)).length,
    unwritten: [...unwritten].filter((id) => cases.includes(id)),
    skipped: [...skipped],
    missing: cases.filter((id) => !tested.has(id) && !unwritten.has(id)),
    unknown: [...tested, ...unwritten].filter((id) => !cases.includes(id)),
    // 同じケース ID で始まるテストが2本以上ある。1ケース1テストの決まりに反し、エビデンスの画像も取り違える
    duplicated: [...duplicated],
  };
}

/**
 * 実行の結果で確定できるかを調べる。確定のチェックとダッシュボードの表示が同じ判定を使う。
 * 試験仕様書の2章のケースのうち、テストコードにできなかったケース（code.md の4章）を除いたすべてに、
 * 実行された結果（パスかフェイル）がなければ確定できない。
 */
export function runCheck(slug) {
  const rp = runPath(slug);
  let run = null;
  try { run = rp && fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, 'utf8')) : null; } catch { run = null; }
  const cp = artifactPath(slug, 'cases');
  const mp = artifactPath(slug, 'code');
  const ids = cp && fs.existsSync(cp) ? tableRows(chapter(fs.readFileSync(cp, 'utf8'), 2)).map((r) => r.ID).filter((id) => /-TC-\d{3}$/.test(id || '')) : [];
  const unwritten = new Set(mp && fs.existsSync(mp) ? tableRows(chapter(fs.readFileSync(mp, 'utf8'), 4)).flatMap((r) => (r['ケース ID'] || '').match(TC_RE) || []) : []);
  const target = ids.filter((id) => !unwritten.has(id));
  const cases = run?.cases || {};
  return {
    run,
    stale: !!run && run.specHash !== specHash(slug),
    total: target.length,
    missing: target.filter((id) => !cases[id]),
    notRun: target.filter((id) => cases[id] && resultKind(cases[id]) === 'not_run'),
    // 環境が整っていなかったケースは、確認箇所にたどり着いていないので、実行されていないのと同じに扱う
    env: target.filter((id) => cases[id] && resultKind(cases[id]) === 'env'),
  };
}

/** 流した結果のうち、フェイルしたケースの ID。学習者が関門3で、ケースごとに原因を判断する対象。 */
export function failedCaseIds(run) {
  return Object.entries(run?.cases || {}).filter(([, c]) => RESULT_KINDS.find((k) => k.key === resultKind(c))?.fail).map(([id]) => id);
}

/**
 * 関門3で、学習者がフェイルしたケースごとに選ぶ原因。confirm が false の原因を選んだケースがあると確定できない
 * （テストの誤りは差し戻して AI に直させ、前の段階の誤りは差し戻して、学習者の依頼でその段階を開き直す）。
 */
export const JUDGE_KINDS = [
  { key: 'impl', label: '実装の不具合', confirm: true, note: 'アプリの振る舞いが仕様と違う。テストは正しい' },
  { key: 'tentative', label: '仕様の仮回答による', confirm: true, note: '観点の段階で仕様の矛盾に仮に選んだ回答と、実装が違う' },
  { key: 'test', label: 'テストの誤り', confirm: false, note: 'テストの操作や確かめ方が、試験ケースと合っていない。差し戻して AI に直させる' },
  { key: 'upstream', label: '前の段階の誤り', confirm: false, note: '試験ケースや観点の期待結果、入力値が誤っている。差し戻して、その段階を開き直す' },
];

/** AI の見立ての種類。triage.md の「見立て」の列は、このどれかで始める。 */
export const TRIAGE_KINDS = ['実装の不具合の候補', '仕様の仮回答による候補', 'テストの誤りの候補', '環境の問題', '判断できない'];

/**
 * フェイルしたケースへの AI の見立て（triage.md）を読む。
 * どの実行の結果への見立てかを、1章の表の「実行の ID」で見分ける。なければ null。
 */
export function readTriage(slug) {
  const tp = triagePath(slug);
  if (!fs.existsSync(tp)) return null;
  const md = fs.readFileSync(tp, 'utf8');
  const runId = (md.match(/\|\s*実行の ID\s*\|\s*`?([A-Za-z0-9]+)`?\s*\|/) || [])[1] || null;
  const rows = {};
  for (const r of tableRows(md)) {
    const id = (r['ケース ID'] || '').match(/[A-Z][A-Z0-9-]*-TC-\d{3}/)?.[0];
    if (id && r['見立て'] !== undefined) rows[id] = { kind: TRIAGE_KINDS.find((k) => (r['見立て'] || '').startsWith(k)) || null, text: r['見立て'] || '', reason: r['根拠'] || '' };
  }
  return { runId, rows };
}

/**
 * テストコードと実行の段階を、学習者に渡せるか（AI の作業が終わっているか）。足りないことを文で返す。
 * 流した結果が今のテストコードのもので、全ケースが実行され、フェイルしたケースすべてに同じ実行への見立てがあること。
 */
/**
 * テストコードの決まり（要素の指定、待ち方、検証の説明、エビデンスの画面など）から外れた書き方を、機械的に見つける。
 * 見つかったら学習者には渡さない（handoffProblems）。AI が直してから渡す。確定は止めない。
 */
export function lintSpec(src) {
  const lines = src.split('\n');
  const at = (re) => lines.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean);
  const rules = [
    ['data-testid を使っている', /data-testid|getByTestId/],
    ['固定時間の待機（waitForTimeout）がある', /waitForTimeout/],
    ['期限を決めずに待っている（期待結果と違うと、時間切れまで止まる）', /\.waitFor\((?![^)]*timeout)/],
    ['CSS や XPath で要素を指定している', /\.locator\(\s*["'`](?![^"'`]*>>)/],
    ['日付の文字列を書いている', /["'`]20\d\d-\d\d-\d\d/],
    ['test.only がある', /\btest\.only\(|\bdescribe\.only\(/],
    ['test.skip か test.fixme で止めたテストがある', /\btest\.(skip|fixme)\(/],
  ];
  const out = rules.map(([label, re]) => ({ label, lines: at(re) })).filter((r) => r.lines.length);
  const tests = Object.values(specChecks(src));
  const noMsg = tests.flatMap((t) => t.checks.filter((k) => !k.message).map((k) => k.line));
  if (noMsg.length) out.push({ label: '検証（expect）に、何を確かめるかの説明がない（画面の「このテストが確かめたこと」に出ない）', lines: noMsg });
  const noShot = tests.filter((t) => !t.evidence).map((t) => t.line);
  if (noShot.length) out.push({ label: '確認箇所の画面を撮っていないテストがある', lines: noShot });
  if (!usesWorkflowTest(src)) out.push({ label: 'テストごとにデータベースを初期データに戻す test（helpers/workflow-test）を使っていない', lines: [] });
  return out;
}

export function handoffProblems(slug) {
  const out = [];
  const cov = codeCoverageOf(slug);
  if (!cov) return ['テストコードかその説明（code.md）がありません。'];
  // ケースとの対応は、学習者の確定を待たずに、渡す前に確かめる（AI が自分で直せるため）
  if (cov.missing.length) out.push(`どのテストにも、「テストコードにできなかったケース」にも載っていないケースがあります（${cov.missing.join('、')}）。`);
  if (cov.unknown.length) out.push(`試験仕様書にないケース ID があります（${cov.unknown.join('、')}）。`);
  if (cov.duplicated.length) out.push(`同じケース ID で始まるテストが2本以上あります（${cov.duplicated.join('、')}）。`);
  const sp = specPath(slug);
  if (fs.existsSync(sp)) {
    for (const l of lintSpec(fs.readFileSync(sp, 'utf8'))) out.push(`決まりから外れた書き方があります：${l.label}${l.lines.length ? `（${l.lines.join('、')} 行目）` : ''}。`);
  }
  const chk = runCheck(slug);
  if (!chk.run) return ['まだ流していません（node scripts/e2e-workflow/run.mjs）。'];
  if (chk.stale) out.push('テストコードが、流したあとで変わっています。流し直してください。');
  if (chk.missing.length) out.push(`結果がないケースがあります（${chk.missing.join('、')}）。`);
  if (chk.notRun.length) out.push(`実行されていないケースがあります（${chk.notRun.join('、')}）。環境を整えて流し直してください。`);
  if (chk.env.length) out.push(`環境が整っていなかったケースがあります（${chk.env.join('、')}）。環境を整えて流し直してください。`);
  const failed = failedCaseIds(chk.run);
  if (failed.length) {
    const tri = readTriage(slug);
    if (!tri) out.push('フェイルしたケースの見立て（triage.md）がありません。');
    else {
      if (tri.runId !== chk.run.runId) out.push(`見立て（triage.md）の実行の ID が、流した結果（${chk.run.runId}）と違います。`);
      const lack = failed.filter((id) => !tri.rows[id]?.kind);
      if (lack.length) out.push(`見立てがない、または見立ての種類が決まりと違うケースがあります（${lack.join('、')}）。`);
    }
  }
  return out;
}

export function codeCoverageOf(slug) {
  const cp = artifactPath(slug, 'cases');
  const mp = artifactPath(slug, 'code');
  const sp = specPath(slug);
  if (![cp, mp, sp].every((x) => x && fs.existsSync(x))) return null;
  return codeCoverage(fs.readFileSync(cp, 'utf8'), fs.readFileSync(sp, 'utf8'), fs.readFileSync(mp, 'utf8'));
}

function discrepanciesOf(slug) {
  const ap = artifactPath(slug, 'perspectives');
  return ap && fs.existsSync(ap) ? parseDiscrepancies(fs.readFileSync(ap, 'utf8')) : [];
}

export function validate(state) {
  const errors = [];
  if (!state || typeof state !== 'object') return ['状態ファイルが JSON のオブジェクトではありません'];
  if (!SLUG_RE.test(state.slug || '')) errors.push('slug が不正です');
  if (typeof state.screen !== 'string' || !state.screen.startsWith('/')) errors.push('screen が不正です');
  if (!state.stages || typeof state.stages !== 'object') errors.push('stages がありません');
  else {
    for (const s of STAGES) {
      const st = state.stages[s.key];
      if (!st) errors.push(`stages.${s.key} がありません`);
      else if (!(st.status in STATUS)) errors.push(`stages.${s.key}.status が不正です: ${st.status}`);
    }
  }
  if (!Array.isArray(state.log)) errors.push('log が配列ではありません');
  return errors;
}

export function readState(slug) {
  const p = statePath(slug);
  if (!fs.existsSync(p)) return null;
  const state = JSON.parse(fs.readFileSync(p, 'utf8'));
  const errors = validate(state);
  if (errors.length) throw new Error(`状態ファイルが壊れています（${p}）: ${errors.join(' / ')}`);
  return state;
}

function writeState(state) {
  const errors = validate(state);
  if (errors.length) throw new Error(`書き込もうとした状態が不正です: ${errors.join(' / ')}`);
  const p = statePath(state.slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

export function listStates() {
  const dir = baseDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && SLUG_RE.test(d.name) && fs.existsSync(path.join(dir, d.name, 'state.json')))
    .map((d) => {
      try {
        return readState(d.name);
      } catch (e) {
        return { slug: d.name, error: e.message };
      }
    });
}

export function initState(slug, screen) {
  assertSlug(slug);
  const existing = readState(slug);
  if (existing) return existing;
  const stages = {};
  for (const s of STAGES) stages[s.key] = { status: 'not_started', updated_at: null, confirmed_at: null };
  const state = { slug, screen, created_at: now(), stages, log: [] };
  state.log.push({ at: now(), by: 'ai', stage: null, action: 'init', note: `${screen} のワークフローを開始` });
  writeState(state);
  return state;
}

/** 今いる段階（最初に「確定」でない段階）。すべて確定なら null。 */
export function currentStage(state) {
  return STAGES.find((s) => state.stages[s.key].status !== 'confirmed') || null;
}

/** 今いる段階で、次に誰が何をするか。 */
export function nextAction(state) {
  const stage = currentStage(state);
  if (!stage) return { stage: null, who: null, text: 'すべての段階が確定しています。' };
  const st = state.stages[stage.key].status;
  const guide = `手順は ${stage.guide} を参照`;
  if (st === 'not_started') {
    if (stage.key === 'cases') return { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、確定した試験観点を試験ケースに展開する' };
    if (stage.key === 'code') return { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、確定した試験ケースからテストコードを作って流し、実行のエビデンスを集める' };
    return stage.key === 'perspectives'
      ? { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で試験観点のたたき台を出力する' }
      : { stage, who: '学習者', text: `AI にこの段階の作業を依頼する（案内スキルはこの段階に未対応。${guide}）` };
  }
  if (st === 'ai_output') {
    if (stage.key === 'cases') return { stage, who: '学習者', text: 'すべての試験ケースを観点と突き合わせてレビューし、ダッシュボードで確定か差し戻しを選ぶ' };
    if (stage.key === 'code') return { stage, who: '学習者', text: 'テストコードは読まずに、説明の2〜4章と、ケースごとの実行のエビデンス（AI の見立てを含む）を見て判断し、ダッシュボードで確定か差し戻しを選ぶ' };
    return stage.key === 'perspectives'
      ? { stage, who: '学習者', text: discrepanciesOf(state.slug).every((q) => isReflected(q, state.stages.perspectives.answers))
        ? '観点一覧をレビューし、ダッシュボードで確定か差し戻しを選ぶ'
        : '観点一覧をレビューし、ダッシュボードで仕様の矛盾に回答して、確定か差し戻しを選ぶ' }
      : { stage, who: '学習者', text: `成果物をレビューし、ダッシュボードで確定か差し戻しを選ぶ（${guide}）` };
  }
  if (st === 'returned') {
    if (stage.key === 'cases') return { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、差し戻しの理由を試験仕様書に反映する' };
    if (stage.key === 'code') return { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、差し戻しの理由に沿ってテストコードを直し、流し直してエビデンスを集め直す' };
    return stage.key === 'perspectives'
      ? { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、差し戻しの理由と仕様の矛盾への回答を観点一覧に反映する' }
      : { stage, who: '学習者', text: `差し戻した理由を添えて AI に直させ、もう一度レビューする（案内スキルはこの段階に未対応。${guide}）` };
  }
  return { stage, who: null, text: '' };
}

/** その段階で最後に差し戻したときの記録（理由を含む）。確定から差し戻しに戻した記録も含む。なければ null。 */
export function lastReturn(state, stageKey) {
  const entries = state.log.filter((l) => l.stage === stageKey && (l.action === 'return' || l.action === 'reopen'));
  return entries.length ? entries[entries.length - 1] : null;
}

/** AI が成果物を出力したことを記録する（案内スキルが使う）。 */
export function markAiOutput(slug, stageKey, note = '') {
  const state = readState(slug);
  if (!state) throw new Error(`状態ファイルがありません: ${slug}（先に init を実行）`);
  const st = state.stages[stageKey];
  if (!st) throw new Error(`段階が不正です: ${stageKey}`);
  if (st.status === 'confirmed') throw new Error(`${stageKey} は確定済みです。確定を取り消すのは学習者だけです`);
  const before = STAGES.slice(0, STAGES.findIndex((s) => s.key === stageKey)).filter((s) => state.stages[s.key].status !== 'confirmed');
  if (before.length) throw new Error(`前の段階（${before.map((s) => s.label).join('、')}）が確定していません。前の段階から順に進めてください`);
  // 試験仕様書は、観点の漏れがないことを確かめてから学習者に渡す（AI が自分で直せるため）
  if (stageKey === 'cases') {
    const cov = coverageOf(slug);
    if (!cov) throw new Error('試験仕様書（cases.md）がありません');
    const problems = [];
    if (cov.missing.length) problems.push(`どの試験ケースにも、「試験ケースにできなかった観点」にも載っていない観点があります（${cov.missing.join('、')}）。展開してください。`);
    if (cov.unknown.length) problems.push(`観点一覧にない観点 ID があります（${cov.unknown.join('、')}）。`);
    if (problems.length) throw new Error(`まだ学習者に渡せません。${problems.join(' ')}`);
  }
  // テストコードと実行の段階は、ケースとの対応、流した結果、見立てがそろってから学習者に渡す
  if (stageKey === 'code') {
    const problems = handoffProblems(slug);
    if (problems.length) throw new Error(`まだ学習者に渡せません。${problems.join(' ')}`);
  }
  st.status = 'ai_output';
  st.updated_at = now();
  state.log.push({ at: now(), by: 'ai', stage: stageKey, action: 'ai_output', note });
  writeState(state);
  return state;
}

/**
 * 学習者の判断を記録する（ダッシュボードだけが使う）。
 * answers は仕様の矛盾への回答（{ 'RSV-NEW-Q-001': 'A' }）。試験観点の段階でだけ使う。
 * 回答は差し戻しと一緒に保存し、AI が観点一覧に反映してから確定する。
 * judgments はフェイルしたケースごとの原因の判断（{ 'RSV-NEW-TC-021': { kind: 'impl', basis: '…' } }）。
 * テストコードと実行の段階でだけ使う。確定するには、フェイルしたすべてのケースに原因と根拠が要る。
 */
export function recordDecision(slug, stageKey, action, note = '', answers = {}, judgments = {}) {
  if (!['confirm', 'return'].includes(action)) throw new Error(`操作が不正です: ${action}`);
  const state = readState(slug);
  if (!state) throw new Error(`状態ファイルがありません: ${slug}`);
  const stage = currentStage(state);
  if (!stage || stage.key !== stageKey) throw new Error('今いる段階以外は操作できません');
  const st = state.stages[stageKey];
  if (st.status !== 'ai_output') throw new Error('確定と差し戻しは「レビュー待ち」のときだけできます（AI の出力や修正を待ってください）');
  let answerNote = '';
  if (stageKey === 'perspectives') {
    const qs = discrepanciesOf(slug);
    const saved = st.answers || {};
    const given = Object.fromEntries(Object.entries(answers).filter(([id, key]) => key && qs.some((q) => q.id === id)));
    const invalid = Object.entries(given).filter(([id, key]) => !qs.find((q) => q.id === id).choices.some((c) => c.key === key));
    if (invalid.length) throw new Error(`回答の選択肢にない値があります（${invalid.map(([id, key]) => `${id} の ${key}`).join('、')}）。画面を読み込み直してから選び直してください`);
    if (action === 'confirm') {
      const changed = Object.keys(given).filter((id) => saved[id]?.choice !== given[id]);
      if (changed.length) throw new Error(`回答を選び直した矛盾があります（${changed.join('、')}）。差し戻して、AI に観点一覧へ反映させてから確定してください`);
      const unanswered = qs.filter((q) => !saved[q.id]);
      if (unanswered.length) throw new Error(`回答していない仕様の矛盾があります（${unanswered.map((q) => q.id).join('、')}）。回答を選んで差し戻し、AI に観点一覧へ反映させてから確定してください`);
      const unreflected = qs.filter((q) => !isReflected(q, saved));
      if (unreflected.length) throw new Error(`回答がまだ観点一覧に反映されていません（${unreflected.map((q) => q.id).join('、')}）。もう一度差し戻して、AI に反映させてください`);
    } else {
      const lines = [];
      for (const [id, key] of Object.entries(given)) {
        const q = qs.find((x) => x.id === id);
        const text = q.choices.find((c) => c.key === key)?.text || '';
        if (saved[id]?.choice !== key) lines.push(`${id} は ${key}（${text}）`);
        saved[id] = { choice: key, text, at: now() };
      }
      st.answers = saved;
      if (lines.length) answerNote = `仕様の矛盾への回答：${lines.join('、')}`;
    }
  }
  if (stageKey === 'cases' && action === 'confirm') {
    const cov = coverageOf(slug);
    if (!cov) throw new Error('試験仕様書（cases.md）がありません');
    if (cov.missing.length) throw new Error(`どの試験ケースにも、「試験ケースにできなかった観点」にも載っていない観点があります（${cov.missing.join('、')}）。差し戻して、AI に展開させてから確定してください`);
    if (cov.unknown.length) throw new Error(`観点一覧にない観点 ID が試験仕様書にあります（${cov.unknown.join('、')}）。差し戻して直させてから確定してください`);
  }
  let judgeNote = '';
  let judged = null;
  if (stageKey === 'code') {
    // 判断の対象は、送られてきた ID ではなく、流した結果から決める
    const failed = failedCaseIds(runCheck(slug).run);
    judged = {};
    for (const id of failed) {
      const j = judgments[id] || {};
      const kind = JUDGE_KINDS.find((k) => k.key === j.kind);
      const basis = String(j.basis || '').trim().slice(0, 500);
      if (kind || basis) judged[id] = { kind: kind?.key || null, basis };
    }
    if (action === 'confirm') {
      const lack = failed.filter((id) => !judged[id]?.kind || !judged[id].basis);
      if (lack.length) throw new Error(`原因か根拠を書いていないフェイルしたケースがあります（${lack.join('、')}）。すべてのケースに原因を選び、根拠を書いてから確定してください`);
      const blocking = failed.filter((id) => !JUDGE_KINDS.find((k) => k.key === judged[id].kind).confirm);
      if (blocking.length) throw new Error(`「テストの誤り」か「前の段階の誤り」と判断したケースがあります（${blocking.join('、')}）。確定せずに差し戻してください`);
    }
    const lines = Object.entries(judged).map(([id, j]) => `${id}：${JUDGE_KINDS.find((k) => k.key === j.kind)?.label || '原因は未選択'}${j.basis ? `（根拠：${j.basis}）` : ''}`);
    if (lines.length) judgeNote = `フェイルしたケースの判断：\n${lines.join('\n')}`;
    if (!Object.keys(judged).length) judged = null;
  }
  if (stageKey === 'code' && action === 'confirm') {
    const cov = codeCoverageOf(slug);
    if (!cov) throw new Error('テストコードかその説明（code.md）がありません');
    if (cov.missing.length) throw new Error(`どのテストにも、「テストコードにできなかったケース」にも載っていないケースがあります（${cov.missing.join('、')}）。差し戻して、AI に書かせてから確定してください`);
    if (cov.unknown.length) throw new Error(`試験仕様書にないケース ID があります（${cov.unknown.join('、')}）。差し戻して直させてから確定してください`);
    if (cov.duplicated.length) throw new Error(`同じケース ID で始まるテストが2本以上あります（${cov.duplicated.join('、')}）。差し戻して、1つのケースを1つのテストにさせてから確定してください`);
    const chk = runCheck(slug);
    if (!chk.run) throw new Error('まだ実行していません。AI にテストを流させ、エビデンスを集めてから確定してください');
    if (chk.stale) throw new Error('テストコードが実行のあとで変わっています。もう一度実行してエビデンスを集め直してから確定してください');
    if (chk.missing.length) throw new Error(`実行の結果がないケースがあります（${chk.missing.join('、')}）。もう一度実行してから確定してください`);
    if (chk.notRun.length) throw new Error(`実行されていないケースがあります（${chk.notRun.join('、')}）。止めたテストを戻すか、環境を整えてもう一度実行してから確定してください`);
    if (chk.env.length) throw new Error(`環境が整っていなかったケースがあります（${chk.env.join('、')}）。差し戻して、AI に環境を整えて流し直させてから確定してください`);
  }
  note = [note.trim(), answerNote, judgeNote].filter(Boolean).join('\n');
  if (action === 'return' && !note) throw new Error('差し戻すときは、理由を書くか、仕様の矛盾に回答してください');
  st.status = action === 'confirm' ? 'confirmed' : 'returned';
  st.updated_at = now();
  if (action === 'confirm') {
    st.confirmed_at = st.updated_at;
    // 確定した時点の成果物の指紋。あとで直接書き換えられたら、ダッシュボードで知らせる
    st.confirmed_hash = stageFingerprint(slug, stageKey);
  }
  state.log.push({ at: now(), by: 'learner', stage: stageKey, action, note, ...(judged ? { judgments: judged } : {}) });
  writeState(state);
  return state;
}

/**
 * 確定した段階を「差し戻し」に戻す（学習者の依頼で案内スキルが使う）。
 * 学習者が後の関門で前の段階の誤り（試験ケースや観点の期待結果の誤りなど）を見つけ、戻すと決めたときに使う。
 * 戻した段階より後の段階は「未着手」に戻し、その成果物は .tmp/e2e-workflow/reopened/ に移す（作り直すため）。
 * AI は、戻した段階を理由に沿って直し、そこから順に段階を進め直す。
 */
export function reopenStage(slug, stageKey, reason) {
  const state = readState(slug);
  if (!state) throw new Error(`状態ファイルがありません: ${slug}`);
  const idx = STAGES.findIndex((s) => s.key === stageKey);
  if (idx < 0) throw new Error(`段階が不正です: ${stageKey}`);
  if (!String(reason || '').trim()) throw new Error('戻す理由を書いてください（学習者が指摘した前の段階の誤り）');
  if (state.stages[stageKey].status !== 'confirmed') throw new Error(`${STAGES[idx].label} は確定していません。戻すのは確定した段階だけです`);
  const later = STAGES.slice(idx + 1);
  // 後の段階の成果物を移す。消さずに残し、何を作り直したかを後から確かめられるようにする
  const stamp = now().replace(/[-:]/g, '').replace(/\..*$/, '');
  const dest = path.join(REPO_ROOT, '.tmp', 'e2e-workflow', 'reopened', `${slug}-${stamp}`);
  const moved = [];
  for (const s of later) {
    for (const f of [...stageFiles(slug, s.key), ...(s.key === 'code' ? [evidenceDir(slug)] : [])]) {
      if (!f || !fs.existsSync(f)) continue;
      fs.mkdirSync(dest, { recursive: true });
      // 置き場所が別のディスクのこともあるので、名前の変更ではなく写してから消す
      fs.cpSync(f, path.join(dest, path.basename(f)), { recursive: true });
      fs.rmSync(f, { recursive: true, force: true });
      moved.push(path.basename(f));
    }
    state.stages[s.key] = { status: 'not_started', updated_at: now(), confirmed_at: null };
  }
  const st = state.stages[stageKey];
  st.status = 'returned';
  st.updated_at = now();
  st.confirmed_at = null;
  delete st.confirmed_hash;
  state.log.push({ at: now(), by: 'learner', stage: stageKey, action: 'reopen', note: String(reason).trim() });
  writeState(state);
  return { state, moved, dest: moved.length ? dest : null };
}

function printSummary(state) {
  console.log(`画面: ${state.screen}（${state.slug}）`);
  for (const s of STAGES) console.log(`  ${s.label}: ${STATUS[state.stages[s.key].status]}`);
  const na = nextAction(state);
  if (na.stage) {
    console.log(`今の段階: ${na.stage.label}\n次にやること（${na.who}）: ${na.text}`);
    const r = state.stages[na.stage.key].status === 'returned' ? lastReturn(state, na.stage.key) : null;
    if (r) console.log(`差し戻しの理由: ${r.note}`);
    const answers = Object.entries(state.stages[na.stage.key].answers || {});
    if (answers.length) console.log(`仕様の矛盾への回答: ${answers.map(([id, a]) => `${id} は ${a.choice}（${a.text}）`).join('、')}`);
  }
  else console.log(na.text);
}

function main(argv) {
  const [cmd, ...args] = argv;
  try {
    if (cmd === 'init') {
      const [slug, screen] = args;
      if (!screen) throw new Error('使い方: init <スラッグ> <画面パス>');
      printSummary(initState(slug, screen));
    } else if (cmd === 'show') {
      const state = readState(args[0]);
      if (!state) throw new Error(`状態ファイルがありません: ${args[0]}`);
      printSummary(state);
    } else if (cmd === 'ai-output') {
      const [slug, stage, ...note] = args;
      printSummary(markAiOutput(slug, stage, note.join(' ')));
    } else if (cmd === 'last-return') {
      const [slug, stage] = args;
      const state = readState(slug);
      if (!state) throw new Error(`状態ファイルがありません: ${slug}`);
      const r = lastReturn(state, stage);
      console.log(r ? `${formatTime(r.at)} に${r.action === 'reopen' ? '確定から差し戻しに戻した' : '差し戻し'}。理由: ${r.note}` : '差し戻しの記録はありません');
    } else if (cmd === 'reopen') {
      const [slug, stage, ...reason] = args;
      const { state, moved, dest } = reopenStage(slug, stage, reason.join(' '));
      if (moved.length) console.log(`後の段階の成果物を移しました（${moved.join('、')} → ${path.relative(REPO_ROOT, dest)}）`);
      printSummary(state);
    } else if (cmd === 'validate') {
      readState(args[0]);
      console.log('ok');
    } else {
      console.log('使い方: init | show | ai-output | last-return | validate | reopen（詳しくはファイル先頭のコメント）');
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(`エラー: ${e.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}

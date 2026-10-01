#!/usr/bin/env node
/**
 * 結合テストのワークフローの状態ファイル（Docs/test/<スラッグ>/state.json）を読み書きする。
 *
 * 状態ファイルを書き換える処理はこのファイルに集める。案内スキル（e2e-workflow）と
 * ダッシュボード（server.mjs）は、どちらもこのファイルを通して状態を扱う。
 *
 * CLI（案内スキルが使う）で行えるのは、状態ファイルの作成、表示、「AI 出力済み」への更新だけ。
 * 「確定」と「差し戻し」、仕様の食い違いへの回答は、ダッシュボードの画面操作（server.mjs）からだけ行う。
 * ただしこれは構成上の分担で、AI が state.json を直接書き換えることまでは防げない。
 *
 * 使い方:
 *   node scripts/e2e-workflow/state.mjs init <スラッグ> <画面パス>
 *   node scripts/e2e-workflow/state.mjs show <スラッグ>
 *   node scripts/e2e-workflow/state.mjs ai-output <スラッグ> <段階> [メモ]
 *   node scripts/e2e-workflow/state.mjs last-return <スラッグ> <段階>
 *   node scripts/e2e-workflow/state.mjs validate <スラッグ>
 *
 * 対象ディレクトリは既定で <リポジトリ>/Docs/test。環境変数 E2E_WORKFLOW_DIR で変えられる。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const STAGES = [
  { key: 'perspectives', label: '1 試験観点', gate: '関門1 観点の確定', artifact: 'perspectives.md', guide: 'docs-next/docs/develop/integration-test/viewpoints.md' },
  { key: 'cases', label: '2 試験ケース', gate: '関門2 ケースの確定', artifact: null, guide: 'docs-next/docs/develop/integration-test/cases.md' },
  { key: 'code', label: '3 テストコード', gate: '関門3 コードの確定', artifact: null, guide: 'docs-next/docs/develop/integration-test/code-generation.md' },
  { key: 'run', label: '4 実行', gate: '関門4 結果の確定', artifact: null, guide: 'docs-next/docs/develop/integration-test/execution.md' },
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
 * 観点一覧の 4.1「仕様の食い違い」の表を読む。
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
    return stage.key === 'perspectives'
      ? { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で試験観点のたたき台を出力する' }
      : { stage, who: '学習者', text: `AI にこの段階の作業を依頼する（案内スキルはこの段階に未対応。${guide}）` };
  }
  if (st === 'ai_output') {
    return stage.key === 'perspectives'
      ? { stage, who: '学習者', text: discrepanciesOf(state.slug).every((q) => isReflected(q, state.stages.perspectives.answers))
        ? '観点一覧をレビューし、ダッシュボードで確定か差し戻しを選ぶ'
        : '観点一覧をレビューし、ダッシュボードで仕様の食い違いに回答して、確定か差し戻しを選ぶ' }
      : { stage, who: '学習者', text: `成果物をレビューし、ダッシュボードで確定か差し戻しを選ぶ（${guide}）` };
  }
  if (st === 'returned') {
    return stage.key === 'perspectives'
      ? { stage, who: 'AI', text: '案内スキル（/e2e-workflow）で、差し戻しの理由と仕様の食い違いへの回答を観点一覧に反映する' }
      : { stage, who: '学習者', text: `差し戻した理由を添えて AI に直させ、もう一度レビューする（案内スキルはこの段階に未対応。${guide}）` };
  }
  return { stage, who: null, text: '' };
}

/** その段階で最後に差し戻したときの記録（理由を含む）。なければ null。 */
export function lastReturn(state, stageKey) {
  const entries = state.log.filter((l) => l.stage === stageKey && l.action === 'return');
  return entries.length ? entries[entries.length - 1] : null;
}

/** AI が成果物を出力したことを記録する（案内スキルが使う）。 */
export function markAiOutput(slug, stageKey, note = '') {
  const state = readState(slug);
  if (!state) throw new Error(`状態ファイルがありません: ${slug}（先に init を実行）`);
  const st = state.stages[stageKey];
  if (!st) throw new Error(`段階が不正です: ${stageKey}`);
  if (st.status === 'confirmed') throw new Error(`${stageKey} は確定済みです。確定を取り消すのは学習者だけです`);
  st.status = 'ai_output';
  st.updated_at = now();
  state.log.push({ at: now(), by: 'ai', stage: stageKey, action: 'ai_output', note });
  writeState(state);
  return state;
}

/**
 * 学習者の判断を記録する（ダッシュボードだけが使う）。
 * answers は仕様の食い違いへの回答（{ 'RSV-NEW-Q-001': 'A' }）。試験観点の段階でだけ使う。
 * 回答は差し戻しと一緒に保存し、AI が観点一覧に反映してから確定する。
 */
export function recordDecision(slug, stageKey, action, note = '', answers = {}) {
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
    if (action === 'confirm') {
      const changed = Object.keys(given).filter((id) => saved[id]?.choice !== given[id]);
      if (changed.length) throw new Error(`回答を選び直した食い違いがあります（${changed.join('、')}）。差し戻して、AI に観点一覧へ反映させてから確定してください`);
      const unanswered = qs.filter((q) => !saved[q.id]);
      if (unanswered.length) throw new Error(`回答していない仕様の食い違いがあります（${unanswered.map((q) => q.id).join('、')}）。回答を選んで差し戻し、AI に観点一覧へ反映させてから確定してください`);
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
      if (lines.length) answerNote = `仕様の食い違いへの回答：${lines.join('、')}`;
    }
  }
  note = [note.trim(), answerNote].filter(Boolean).join('\n');
  if (action === 'return' && !note) throw new Error('差し戻すときは、理由を書くか、仕様の食い違いに回答してください');
  st.status = action === 'confirm' ? 'confirmed' : 'returned';
  st.updated_at = now();
  if (action === 'confirm') st.confirmed_at = st.updated_at;
  state.log.push({ at: now(), by: 'learner', stage: stageKey, action, note });
  writeState(state);
  return state;
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
    if (answers.length) console.log(`仕様の食い違いへの回答: ${answers.map(([id, a]) => `${id} は ${a.choice}（${a.text}）`).join('、')}`);
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
      console.log(r ? `${formatTime(r.at)} に差し戻し。理由: ${r.note}` : '差し戻しの記録はありません');
    } else if (cmd === 'validate') {
      readState(args[0]);
      console.log('ok');
    } else {
      console.log('使い方: init | show | ai-output | last-return | validate（詳しくはファイル先頭のコメント）');
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

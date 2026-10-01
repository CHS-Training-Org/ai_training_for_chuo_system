#!/usr/bin/env node
/**
 * 結合テストのワークフローのダッシュボード。
 *
 * 画面ごとの状態（Docs/test/<スラッグ>/state.json）を一覧し、試験観点の一覧を表示して、
 * 学習者が仕様の食い違いに回答し、関門で「確定」か「差し戻し」を選ぶための画面を出す。
 * 「確定」と「差し戻し」、回答を状態ファイルに書けるのは、この画面からの操作だけにしている。
 *
 * 使い方:
 *   node scripts/e2e-workflow/server.mjs            # http://localhost:3130
 *   PORT=3131 node scripts/e2e-workflow/server.mjs
 *   E2E_WORKFLOW_DIR=/path/to/dir node scripts/e2e-workflow/server.mjs
 *
 * devcontainer 内で起動し、VS Code のポート転送で手元のブラウザから開く。
 * 依存パッケージは使わない（Node の標準モジュールだけ）。Markdown の描画だけ CDN の marked を使い、
 * 読めない環境では生のテキストを表示する。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  STAGES, STATUS, baseDir, listStates, readState, artifactPath, currentStage, nextAction, recordDecision,
  formatTime, parseDiscrepancies, isReflected, lastReturn,
} from './state.mjs';

const PORT = Number(process.env.PORT || 3130);
const HOST = process.env.HOST || '127.0.0.1';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 色はワークフローのページの図にそろえる（学習者は橙、AI は青）
const CSS = `
:root {
  --bg:#f6f7f9; --panel:#fff; --line:#e5e7eb; --line-strong:#d1d5db; --text:#111827; --sub:#4b5563; --mute:#6b7280;
  --learner:#ea580c; --learner-bg:#fff7ed; --learner-line:#fed7aa;
  --ai:#2563eb; --ai-bg:#eff6ff; --ai-line:#bfdbfe;
  --ok:#16a34a; --ok-bg:#f0fdf4; --ok-line:#bbf7d0;
  --ng:#dc2626; --ng-bg:#fef2f2; --ng-line:#fecaca;
  --idle:#9ca3af; --idle-bg:#f3f4f6;
  --radius:10px; --shadow:0 1px 2px rgba(17,24,39,.06), 0 1px 3px rgba(17,24,39,.08);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 120px; }
body { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans CJK JP", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif; margin:0; color:var(--text); background:var(--bg); line-height:1.6; }
a { color: var(--ai); }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
.topbar { position: sticky; top:0; z-index: 20; background: #fff; border-bottom:1px solid var(--line); }
.topbar-in { max-width: 1600px; margin: 0 auto; padding: 10px 24px; display:flex; align-items:center; gap:12px; }
.brand { font-weight:700; color:var(--text); text-decoration:none; display:flex; align-items:center; gap:8px; }
.brand-mark { width:22px; height:22px; border-radius:6px; background: linear-gradient(135deg, var(--learner) 0 50%, var(--ai) 50% 100%); }
.crumb { color: var(--mute); font-size: 14px; }
.crumb a { color: inherit; text-decoration: none; }
.crumb a:hover { text-decoration: underline; }
main { max-width: 1600px; margin: 0 auto; padding: 24px; }
main.narrow { max-width: 1200px; }
footer { max-width: 1600px; margin: 0 auto; padding: 8px 24px 32px; color: var(--mute); font-size: 12px; }
h1 { font-size: 26px; line-height:1.3; margin: 4px 0 4px; }
h2 { font-size: 18px; margin: 0 0 12px; }
.subtitle { color: var(--sub); margin: 0 0 16px; }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow); padding:20px 24px; margin: 0 0 20px; }
.muted { color: var(--mute); font-size: 13px; }

/* 状態のバッジと「誰の番か」の印 */
.badge { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid; }
.badge::before { content:""; width:7px; height:7px; border-radius:50%; background: currentColor; }
.b-not_started { background:var(--idle-bg); border-color:var(--line-strong); color:#4b5563; }
.b-ai_output { background:var(--learner-bg); border-color:var(--learner-line); color:#c2410c; }
.b-returned { background:var(--ng-bg); border-color:var(--ng-line); color:#b91c1c; }
.b-confirmed { background:var(--ok-bg); border-color:var(--ok-line); color:#15803d; }
.who { display:inline-flex; align-items:center; gap:6px; padding:2px 10px; border-radius:6px; font-size:12px; font-weight:700; color:#fff; white-space:nowrap; }
.who-learner { background: #c2410c; }
.who-ai { background: var(--ai); }
.who-done { background: #15803d; }

/* 4つの段階の進み具合 */
.stepper { display:grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: 4px 0 0; padding:0; list-style:none; }
.step { position: relative; padding: 0 8px 0 0; }
.step-line { flex: 1 1 auto; min-width: 12px; height: 2px; margin: 15px 4px 0 0; background: var(--line-strong); }
.step.done .step-line { background: var(--ok); }
.step-inner { display:flex; gap:10px; align-items:flex-start; text-decoration:none; color: inherit; border-radius: 8px; padding: 0; }
.dot { flex: none; position: relative; z-index:1; width:32px; height:32px; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:14px; background:#fff; border:2px solid var(--line-strong); color: var(--mute); }
.step.st-ai_output .dot { border-color: var(--learner); color: var(--learner); background: var(--learner-bg); }
.step.st-returned .dot { border-color: var(--ng); color: var(--ng); background: var(--ng-bg); }
.step.st-confirmed .dot { border-color: var(--ok); background: var(--ok); color:#fff; }
.step.current .dot { box-shadow: 0 0 0 4px rgba(234,88,12,.18); }
.step.current.st-returned .dot { box-shadow: 0 0 0 4px rgba(220,38,38,.15); }
.step.viewing .step-name { text-decoration: underline; text-underline-offset: 4px; }
.step-body { min-width: 0; flex: 0 1 auto; padding-right: 8px; }
.step-name { font-weight: 700; font-size: 14px; }
.step-meta { font-size: 12px; color: var(--mute); white-space: nowrap; line-height: 1.5; }
.step-name { white-space: nowrap; }
.segs { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; }
.seg-bar { display:block; height: 6px; border-radius: 3px; background: var(--line); }
.seg.st-ai_output .seg-bar { background: var(--learner); }
.seg.st-returned .seg-bar { background: var(--ng); }
.seg.st-confirmed .seg-bar { background: var(--ok); }
.seg-label { display:block; margin-top: 6px; font-size: 12px; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seg.current .seg-label { color: var(--text); font-weight: 700; }
.seg-state { display:block; font-size: 11px; color: var(--mute); white-space: nowrap; }

/* 次にやること */
.next { display:flex; gap:14px; align-items:flex-start; border-radius: 8px; padding: 12px 16px; margin: 0; border:1px solid; }
.status .next { margin-top: 18px; }
.next.learner { background: var(--learner-bg); border-color: var(--learner-line); }
.next.ai { background: var(--ai-bg); border-color: var(--ai-line); }
.next.done { background: var(--ok-bg); border-color: var(--ok-line); }
.next-label { font-size: 12px; font-weight: 700; color: var(--sub); margin-bottom: 0; line-height: 1.4; }
.next-text { font-size: 15px; font-weight: 700; }
.next .who { margin-top: 2px; }
.next-actions { margin-top: 10px; display:flex; flex-wrap: wrap; gap: 8px; align-items:center; }
.cmd { display:inline-flex; align-items:center; gap:8px; background:#0f172a; color:#e2e8f0; border-radius:8px; padding:6px 6px 6px 12px; font-size:13px; max-width:100%; }
.cmd code { white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
.cmd button { flex: none; white-space: nowrap; background:#334155; color:#fff; border:0; border-radius:6px; padding:3px 10px; font-size:12px; cursor:pointer; }
.cmd button:hover { background:#475569; }
.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; font:inherit; font-weight:700; padding:9px 18px; border-radius:8px; border:1px solid transparent; cursor:pointer; text-decoration:none; }
.btn-confirm { background: #15803d; color:#fff; }
.btn-confirm:hover { background:#166534; }
.btn-return { background:#fff; color: var(--ng); border-color: var(--ng-line); }
.btn-return:hover { background: var(--ng-bg); }
.btn-ghost { background:#fff; color: var(--text); border-color: var(--line-strong); font-weight:600; }
.btn:disabled { background:#e5e7eb; color:#9ca3af; border-color: transparent; cursor:not-allowed; }

/* 一覧画面 */
.stats { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 0 0 20px; }
.stat { background:var(--panel); border:1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); }
.stat-num { font-size: 26px; font-weight: 800; line-height: 1.1; }
.stat-label { font-size: 13px; color: var(--sub); }
.stat.learner .stat-num { color: var(--learner); }
.stat.ai .stat-num { color: var(--ai); }
.stat.ok .stat-num { color: var(--ok); }
.screens { display:grid; gap: 12px; }
.screen-card { display:block; background:var(--panel); border:1px solid var(--line); border-left: 5px solid var(--idle); border-radius: var(--radius); padding: 16px 20px; box-shadow: var(--shadow); text-decoration:none; color: inherit; }
.screen-card:hover { border-color: var(--line-strong); box-shadow: 0 4px 12px rgba(17,24,39,.08); }
.screen-card.turn-learner { border-left-color: var(--learner); }
.screen-card.turn-ai { border-left-color: var(--ai); }
.screen-card.turn-done { border-left-color: var(--ok); }
.screen-name { font-weight: 700; font-size: 16px; }
.screen-path { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; color: var(--mute); }
.card-top { display:flex; gap: 12px 32px; align-items:flex-start; justify-content: space-between; flex-wrap: wrap; margin-bottom: 14px; }
.card-title { flex: 0 1 auto; min-width: 0; }
.card-next { flex: 0 1 560px; display:flex; gap: 10px; align-items: flex-start; font-size: 14px; color: var(--sub); }
.card-next .who { flex: none; margin-top: 1px; }
.empty { text-align:center; padding: 48px 24px; }

/* 画面ごとのページ：左に観点一覧、右に関門 */
.layout { display:grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; }
.aside { position: sticky; top: 72px; max-height: calc(100vh - 88px); overflow:auto; }
.aside .panel { padding: 18px 20px; }
.aside .cmd { display:flex; }
.aside .cmd code { white-space: normal; overflow-wrap: anywhere; }
.jump, .only-narrow { display:none !important; }
.jump.is-hidden { display:none !important; }
@media (max-width: 1200px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .aside { position: static; max-height:none; overflow: visible; }
  .only-narrow { display:inline-flex !important; }
  .jump { display:inline-flex !important; background:#111827; color:#fff; position: fixed; right: 16px; bottom: 16px; z-index: 30; box-shadow: 0 6px 16px rgba(17,24,39,.2); }
}
@media (max-width: 900px) {
  main { padding: 16px; }
  .topbar-in { padding: 10px 16px; }
  .stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 640px) {
  .stepper:not(.compact) { grid-template-columns: 1fr 1fr; row-gap: 14px; }
  .stepper:not(.compact) .step:nth-child(2) .step-line { display:none; }
}

/* 関門の入力 */
.gate-title { display:flex; align-items:center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.gate-title h2 { margin: 0; }
.q { border:1px solid var(--line); border-radius: 8px; padding: 12px 14px; margin: 0 0 12px; }
.q.need { border-color: var(--learner-line); background: #fffbf7; }
.q-head { display:flex; gap: 6px 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
.q-head .q-state { margin: 0 0 0 auto; }
.choices { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; }
.choices .choice { margin: 0; }
.ans-sum { display:flex; justify-content: space-between; gap: 8px; align-items:center; flex-wrap: wrap; text-decoration:none; color: var(--text); border:1px solid var(--learner-line); background: var(--learner-bg); border-radius: 8px; padding: 8px 12px; font-size: 13px; margin: 0 0 4px; }
.ans-sum.ok { border-color: var(--ok-line); background: var(--ok-bg); }
.ans-sum strong { white-space: nowrap; }
.q-id { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--mute); }
.q-text { font-weight: 700; font-size: 14px; }
.choice { display:flex; gap:8px; align-items:flex-start; border:1px solid var(--line); border-radius: 8px; padding: 8px 10px; margin: 6px 0; font-size: 14px; cursor:pointer; background:#fff; }
.choice:hover { border-color: var(--line-strong); }
.choice input { margin-top: 4px; }
.choice:has(input:checked) { border-color: var(--learner); background: var(--learner-bg); }
.q-impact { font-size: 13px; color: var(--sub); margin: 8px 0 0; }
.q-state { display:inline-block; font-size: 12px; font-weight: 700; margin-top: 6px; }
.q-state.ok { color: var(--ok); }
.q-state.wait { color: var(--learner); }
.q-state.none { color: var(--mute); }
label.field { display:block; font-weight: 700; font-size: 14px; margin: 12px 0 4px; }
.hint { font-weight: 400; color: var(--mute); font-size: 12px; }
textarea { width:100%; min-height: 110px; font: inherit; font-size: 14px; border:1px solid var(--line-strong); border-radius: 8px; padding: 8px 10px; resize: vertical; }
textarea:focus, .choice:focus-within { outline: 2px solid var(--ai-line); outline-offset: 1px; }
.actions { display:flex; gap: 8px; flex-wrap: wrap; }
.gate-actions { margin-top: 12px; }
/* 右の欄が画面より長いときも、ボタンの列は欄の下端に見えたままにする */
.aside .gate-actions { position: sticky; bottom: -18px; background: #fff; margin: 12px -20px -18px; padding: 12px 20px 16px; border-top: 1px solid var(--line); box-shadow: 0 -6px 12px -8px rgba(17,24,39,.15); z-index: 2; }
.actions .btn { flex: 1 1 140px; }
.why-disabled { font-size: 12px; color: var(--learner); margin: 8px 0 0; }
.note-box { background: var(--ng-bg); border: 1px solid var(--ng-line); border-radius: 8px; padding: 10px 12px; font-size: 14px; white-space: pre-wrap; }
.facts { margin: 12px 0; padding: 4px 12px; background: var(--bg); border-radius: 8px; }
.fact { display:flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 5px 0; border-bottom: 1px solid var(--line); }
.fact:last-child { border-bottom: 0; }
.fact dt { font-size: 13px; color: var(--sub); }
.fact dd { margin: 0; font-size: 16px; font-weight: 800; }

/* 記録 */
.timeline { list-style: none; margin: 0; padding: 0; }
.tl { display:grid; grid-template-columns: 14px 1fr; gap: 10px; padding: 0 0 14px; position: relative; }
.tl::before { content:""; position:absolute; left: 6px; top: 16px; bottom: 0; width: 2px; background: var(--line); }
.tl:last-child::before { display:none; }
.tl-dot { width: 14px; height: 14px; border-radius: 50%; margin-top: 4px; background: var(--idle); border: 3px solid #fff; box-shadow: 0 0 0 1px var(--line-strong); }
.tl.by-ai .tl-dot { background: var(--ai); }
.tl.by-learner .tl-dot { background: var(--learner); }
.tl.act-confirm .tl-dot { background: var(--ok); }
.tl.act-return .tl-dot { background: var(--ng); }
.tl-head { font-size: 13px; display:flex; gap: 8px; flex-wrap: wrap; align-items: baseline; }
.tl-act { font-weight: 700; }
.tl-time { color: var(--mute); font-size: 12px; white-space: nowrap; }
.tl-note { font-size: 13px; color: var(--sub); white-space: pre-wrap; overflow-wrap: anywhere; }

/* 観点一覧（Markdown を描画したもの） */
.doc-head { display:flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.doc-path { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--mute); overflow-wrap:anywhere; }
.toc { position: sticky; top: 46px; z-index: 10; background: #f6f7f9; backdrop-filter: blur(6px); margin: 0 -4px 12px; padding: 8px 4px; display:flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid var(--line); }
.toc a { display:inline-flex; gap: 6px; align-items:center; text-decoration:none; color: var(--text); background:#fff; border:1px solid var(--line); border-radius: 999px; padding: 3px 12px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.toc a:hover { border-color: var(--line-strong); }
.toc a.active { border-color: var(--text); }
.toc .n { font-size: 12px; color: var(--mute); font-weight: 700; }
.toc a.attn { border-color: var(--learner-line); background: var(--learner-bg); }
#artifact { container-type: inline-size; font-size: 14px; }
#artifact.pending pre { display:none; }
#artifact .loading { color: var(--mute); }
#artifact pre { white-space: pre-wrap; }
#artifact > h1 { display:none; }
#artifact h2 { font-size: 18px; margin: 28px 0 10px; padding-top: 4px; border-top: 1px solid var(--line); padding-top: 20px; }
#artifact h2:first-of-type { border-top: 0; padding-top: 0; margin-top: 8px; }
#artifact h3 { font-size: 15px; margin: 18px 0 8px; color: var(--sub); }
#artifact p, #artifact ul { margin: 6px 0 10px; }
#artifact ul { padding-left: 20px; }
#artifact li { margin: 3px 0; }
#artifact table { border-collapse: separate; border-spacing: 0; width: 100%; background:#fff; border:1px solid var(--line); border-radius: 8px; overflow: hidden; }
#artifact th, #artifact td { border-bottom:1px solid var(--line); padding: 8px 10px; text-align:left; vertical-align:top; }
#artifact tr:last-child td { border-bottom: 0; }
#artifact th { background:#f9fafb; font-size: 12px; color: var(--sub); font-weight: 700; }
#artifact tbody tr:hover td { background: #fafafa; }
#artifact .table-wrap { overflow-x: auto; margin: 8px 0 12px; }
#artifact td code { overflow-wrap: anywhere; }
#artifact .col-nowrap { white-space: nowrap; }
#artifact .col-id { white-space: nowrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--sub); }
#artifact .col-main { min-width: 20em; }
#artifact .col-main.is-text { font-weight: 500; }
#artifact .col-note { min-width: 8em; color: var(--sub); }
#artifact .col-hide { display: none; }
#artifact .inline-always { margin-top: 6px; font-size: 13px; color: var(--sub); font-weight: 400; }
#artifact .inline-answer { color: #15803d; font-weight: 700; }
#artifact .col-src { width: 30%; font-size: 12px; color: var(--sub); }
#artifact .src-inline { display: none; margin-top: 4px; font-size: 12px; color: var(--sub); }
#artifact .meta-table { width: auto; }
#artifact .count-table { width: auto; min-width: 360px; }
#artifact .count-table td:last-child { text-align: right; font-weight: 700; }
#artifact details.meta { margin: 0 0 8px; }
#artifact details.meta summary { cursor: pointer; color: var(--sub); font-size: 13px; }
#artifact .chip { display:inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid var(--line-strong); background: var(--idle-bg); color: var(--sub); }
#artifact .chip.ok { background: var(--ok-bg); border-color: var(--ok-line); color: #15803d; }
#artifact .chip.ng { background: var(--ng-bg); border-color: var(--ng-line); color: #b91c1c; }
#artifact .chip.reason { background: #f5f3ff; border-color: #ddd6fe; color: #6d28d9; }
#artifact .answered { color: var(--ok); font-weight: 700; }
#artifact .col-answer { min-width: 9em; }
#artifact .col-wide { min-width: 12em; }
/* 表示幅が狭いときは記載元の列を消し、同じ行の本文の下に出す */
@container (max-width: 1000px) {
  #artifact .has-inline { display: none; }
  #artifact .src-inline { display: block; }
}
.copied { color: var(--ok) !important; }

/* 読んでいる章に合わせた表示の幅。1〜3章を読んでいる間は観点一覧を全幅にし、関門の欄は下の帯にたたむ */
html { overflow-anchor: none; }
.layout { transition: grid-template-columns .26s ease, column-gap .26s ease; }
.layout > .aside { transition: opacity .18s ease .08s; }
.layout.wide { grid-template-columns: minmax(0, 1fr) 0px; column-gap: 0; }
.layout.wide > .aside { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .1s ease, visibility 0s linear .1s; }
body.drawer-open .layout.wide > .aside { visibility: visible; opacity: 1; pointer-events: auto; position: fixed; top: 64px; right: 20px; width: 380px; max-height: calc(100vh - 150px); z-index: 40; border-radius: var(--radius); box-shadow: 0 16px 40px rgba(17,24,39,.28); transition: none; }
body.drawer-open .layout.wide > .aside .panel { margin: 0; }
.drawer-close { display: none; }
body.drawer-open .drawer-close { display: inline-flex; }
.focus-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 35; background: #fff; border-top: 1px solid var(--line); box-shadow: 0 -8px 20px rgba(17,24,39,.08); transform: translateY(110%); transition: transform .22s ease; }
body.focus-wide .focus-bar { transform: none; }
.focus-bar-in { max-width: 1600px; margin: 0 auto; padding: 10px 24px; display: flex; align-items: center; gap: 10px 18px; flex-wrap: wrap; }
.fb-title { font-weight: 700; white-space: nowrap; }
.fb-meta { color: var(--sub); font-size: 13px; white-space: nowrap; }
.fb-meta strong { color: var(--text); }
.fb-spacer { flex: 1 1 auto; }
.fb-warn { color: #c2410c; font-size: 12px; font-weight: 700; }
/* 関門の欄を重ねて開いている間は、帯のボタンを重複させない */
body.drawer-open .focus-bar .btn { display: none; }
.focus-bar .btn { padding: 7px 16px; }
body.focus-wide main { padding-bottom: 88px; }
.layout-switch { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 8px; overflow: hidden; background: #fff; }
.layout-switch button { font: inherit; font-size: 12px; font-weight: 600; padding: 4px 10px; background: #fff; border: 0; border-right: 1px solid var(--line); cursor: pointer; color: var(--sub); white-space: nowrap; }
.layout-switch button:last-child { border-right: 0; }
.layout-switch button[aria-pressed="true"] { background: var(--text); color: #fff; }
.doc-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
@media (max-width: 1200px) { .layout-switch, .layout-switch-label, .focus-bar { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .layout, .layout > .aside, .focus-bar { transition: none !important; } html { scroll-behavior: auto; } }
`;

// クリップボードへのコピー、章の目次、Markdown の描画。テンプレート文字列の中に置くので ` と ${ は使わない
const CLIENT_JS = `
// 関門の欄が見えている間は「判断の入力へ」のボタンを隠す
document.addEventListener('DOMContentLoaded', function () {
  var jump = document.querySelector('.jump'), gate = document.getElementById('decision');
  if (!jump || !gate) return;
  var check = function () { var r = gate.getBoundingClientRect(); jump.classList.toggle('is-hidden', r.top < window.innerHeight && r.bottom > 0); };
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  check();
});
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-copy]');
  if (!b) return;
  var t = b.getAttribute('data-copy');
  var done = function () { var old = b.textContent; b.textContent = 'コピーしました'; b.classList.add('copied'); setTimeout(function () { b.textContent = old; b.classList.remove('copied'); }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {}); else done();
});
`;

const RENDER_JS = `
(function () {
  var src = document.getElementById('artifact-src');
  var out = document.getElementById('artifact');
  if (!src || !out) return;
  if (!window.marked) { out.classList.remove('pending'); var l = out.querySelector('.loading'); if (l) l.remove(); return; }
  out.innerHTML = window.marked.parse(src.value);
  out.classList.remove('pending');
  // 列の役割を見出しの文字で決める。列の順番には頼らない
  var ID = ['ID', '#'];
  var NOWRAP = ['区分'];
  var MAIN = ['仕様の内容', '試験観点', '観点', '質問'];
  var SRC = ['記載元', '仕様根拠', '見た箇所'];
  var NOTE = ['備考', '補足'];
  var REASONS = ['取るに足らない', '上流のテストで担保済み', '手動確認に隔離', 'この画面の対象範囲外', '共通の観点で担保'];
  out.querySelectorAll('table').forEach(function (table) {
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    if (heads.length === 2 && heads[0] === '区分' && heads[1] === '件数') table.classList.add('count-table');
    if (heads[0] === '項目' && heads[1] === '内容') {
      table.classList.add('meta-table');
      var det = document.createElement('details');
      det.className = 'meta';
      det.innerHTML = '<summary>この一覧の情報（対象画面、参照した仕様書、作成日）</summary>';
      wrap.parentNode.insertBefore(det, wrap);
      det.appendChild(wrap);
    }
    var role = heads.map(function (h) {
      return ID.indexOf(h) >= 0 ? 'id' : NOWRAP.indexOf(h) >= 0 ? 'nowrap' : MAIN.indexOf(h) >= 0 ? 'main' : SRC.indexOf(h) >= 0 ? 'src' : NOTE.indexOf(h) >= 0 ? 'note' : h === '理由' ? 'reason' : h === '回答' ? 'answer' : h.indexOf('回答の選択肢') === 0 || h === '影響する観点' ? 'wide' : '';
    });
    // 3章のように理由の列がある表では、補足（理由の説明）を観点の下に出し、理由の列に幅を回す
    if (role.indexOf('reason') >= 0) role = role.map(function (x) { return x === 'note' ? 'wide' : x; });
    var main = role.indexOf('main');
    table.querySelectorAll('tr').forEach(function (tr) {
      var cells = tr.children;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (role[i]) c.classList.add('col-' + role[i]);
        var always = (role[i] === 'wide' || role[i] === 'answer') && main >= 0;
        var inl = role[i] === 'src' && main >= 0;
        if (always) c.classList.add('col-hide');
        if (c.tagName !== 'TD') { if (inl) c.classList.add('has-inline'); continue; }
        var text = c.textContent.trim();
        if (role[i] === 'main') c.classList.add('is-text');
        if (role[i] === 'nowrap' && (text === '確定' || text === '矛盾')) c.innerHTML = '<span class="chip ' + (text === '確定' ? 'ok' : 'ng') + '">' + text + '</span>';
        if (role[i] === 'reason' && REASONS.indexOf(text) >= 0) c.innerHTML = '<span class="chip reason">' + text + '</span>';
        if (role[i] === 'answer' && text) c.classList.add('answered');
        if (always && text && cells[main]) {
          var al = document.createElement('div');
          al.className = 'inline-always' + (role[i] === 'answer' ? ' inline-answer' : '');
          al.innerHTML = '<strong>' + heads[i] + '：</strong>' + c.innerHTML;
          cells[main].appendChild(al);
        }
        if (inl) {
          c.classList.add('has-inline');
          if (cells[main]) {
            var div = document.createElement('div');
            div.className = 'src-inline';
            div.innerHTML = '<strong>' + heads[i] + '：</strong>' + c.innerHTML;
            cells[main].appendChild(div);
          }
        }
      }
    });
  });
  // 章に ID を振り、目次から飛べるようにする
  var toc = document.getElementById('toc');
  var links = [];
  out.querySelectorAll('h2').forEach(function (h, idx) {
    var m = h.textContent.trim().match(/^(\\d+)\\.\\s*(.+)$/);
    h.id = 'ch-' + (m ? m[1] : idx);
    if (!toc) return;
    var a = document.createElement('a');
    a.href = '#' + h.id;
    var count = toc.getAttribute('data-count-' + (m ? m[1] : '')) || '';
    a.innerHTML = (m ? m[1] + '. ' + m[2] : h.textContent) + (count ? ' <span class="n">' + count + '</span>' : '');
    if (m && m[1] === '4' && toc.getAttribute('data-attn') === '1') a.classList.add('attn');
    toc.appendChild(a);
    links.push([h, a]);
  });
  // 今読んでいる章の目次に印を付ける
  if (toc && links.length) {
    var ticking = false;
    var mark = function () {
      ticking = false;
      var cur = links[0][1];
      links.forEach(function (p) { if (p[0].getBoundingClientRect().top < 220) cur = p[1]; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = links[links.length - 1][1];
      links.forEach(function (p) { p[1].classList.toggle('active', p[1] === cur); });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  }
})();
`;

const FOCUS_JS = `
(function () {
  var layout = document.getElementById('layout');
  var artifact = document.getElementById('artifact');
  if (!layout || !artifact) return;
  var WIDE = { 'ch-1': true, 'ch-2': true, 'ch-3': true };
  var KEY = 'e2e-workflow-layout';
  var pref = 'auto';
  try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  var twoCol = window.matchMedia('(min-width: 1201px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var log = window.__e2eFocusLog = [];
  // 章の境目。回答欄と4章以降は2列、1〜3章は全幅
  var marks = [];
  var ans = document.getElementById('answers');
  if (ans) marks.push({ el: ans, wide: false });
  artifact.querySelectorAll('h2[id^="ch-"]').forEach(function (h) { marks.push({ el: h, wide: !!WIDE[h.id] }); });
  var wideAt = function (y) { var w = false; marks.forEach(function (m) { if (m.el.getBoundingClientRect().top <= y) w = m.wide; }); return w; };
  var current = false, busyUntil = 0;
  // 幅を変える前後で、画面の読み取り線にある行が同じ位置に見えるようにする
  var anchorAt = function (y) {
    var r = artifact.getBoundingClientRect();
    var el = document.elementFromPoint(r.left + Math.min(40, r.width / 2), y);
    while (el && el !== artifact && !/^(TR|H2|H3|P|LI|DETAILS)$/.test(el.tagName)) el = el.parentElement;
    if (el && el !== artifact && artifact.contains(el)) return el;
    // 行の間の余白に当たったときは、読み取り線より上にある最後の見出しを基準にする
    var best = null;
    artifact.querySelectorAll('h2, h3').forEach(function (h) { if (h.getBoundingClientRect().top <= y) best = h; });
    return best;
  };
  var apply = function (wide, reason) {
    if (wide === current) return;
    var line = window.innerHeight * 0.35;
    var a = anchorAt(line), before = a ? a.getBoundingClientRect().top : 0;
    current = wide;
    layout.classList.toggle('wide', wide);
    document.body.classList.toggle('focus-wide', wide);
    if (!wide) document.body.classList.remove('drawer-open');
    var dur = reduce.matches ? 0 : 320, t0 = performance.now();
    busyUntil = t0 + dur + 50;
    var fix = function () {
      if (a) { var d = a.getBoundingClientRect().top - before; if (Math.abs(d) >= 0.5) window.scrollTo({ top: window.scrollY + d, behavior: 'instant' }); }
      if (performance.now() - t0 < dur) requestAnimationFrame(fix);
      else log.push({ y: Math.round(window.scrollY), wide: wide, reason: reason, drift: a ? Math.round(a.getBoundingClientRect().top - before) : null });
    };
    fix();
  };
  var ticking = false;
  var evaluate = function () {
    ticking = false;
    if (performance.now() < busyUntil) { setTimeout(evaluate, busyUntil - performance.now()); return; }
    if (!twoCol.matches) return apply(false, 'screen');
    if (pref === 'wide') return apply(true, 'pref');
    if (pref === 'split') return apply(false, 'pref');
    if (document.body.classList.contains('drawer-open')) return;
    // 境目が読み取り線の前後 56px にある間は切り替えない（行ったり来たりを防ぐ）
    var line = window.innerHeight * 0.35, h = 56;
    var up = wideAt(line - h), down = wideAt(line + h);
    if (up === down) apply(up, 'scroll');
  };
  var schedule = function () { if (!ticking) { ticking = true; requestAnimationFrame(evaluate); } };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  var sync = function () { document.querySelectorAll('[data-layout]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-layout') === pref)); }); };
  document.querySelectorAll('[data-layout]').forEach(function (b) {
    b.addEventListener('click', function () { pref = b.getAttribute('data-layout'); try { localStorage.setItem(KEY, pref); } catch (e) {} sync(); evaluate(); });
  });
  sync();
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-drawer]');
    if (!b) return;
    var open = b.getAttribute('data-drawer') === 'open';
    document.body.classList.toggle('drawer-open', open);
    if (open) { var n = document.getElementById('note'); if (n) n.focus({ preventScroll: true }); } else schedule();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) { document.body.classList.remove('drawer-open'); schedule(); } });
  evaluate();
})();
`;

function page(title, body, { crumb = '', narrow = false } = {}) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="topbar"><div class="topbar-in"><a class="brand" href="/"><span class="brand-mark"></span>結合テストのワークフロー</a>${crumb ? `<span class="crumb">/ ${crumb}</span>` : ''}</div></div>
<main${narrow ? ' class="narrow"' : ''}>${body}</main>
<footer>対象のディレクトリ：<code>${esc(baseDir())}</code></footer>
<script>${CLIENT_JS}</script></body></html>`;
}

function badge(status) {
  return `<span class="badge b-${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

function whoChip(who) {
  if (who === 'AI') return '<span class="who who-ai">AI の番</span>';
  if (who === '学習者') return '<span class="who who-learner">学習者の番</span>';
  return '<span class="who who-done">完了</span>';
}

function turnClass(who) {
  return who === 'AI' ? 'ai' : who === '学習者' ? 'learner' : 'done';
}

/** 観点一覧の見出し（「# 予約申請フォーム（`/reservations/new`）試験観点一覧」）から画面名を取る。 */
function screenName(slug) {
  const ap = artifactPath(slug, 'perspectives');
  if (!ap || !fs.existsSync(ap)) return '';
  const h1 = fs.readFileSync(ap, 'utf8').match(/^# (.+)$/m);
  return h1 ? h1[1].split('（')[0].trim() : '';
}

/** 5章「集計」の表を読む。 */
function summaryCounts(md) {
  const i = md.search(/^## 5\. /m);
  if (i < 0) return [];
  return md.slice(i).split('\n').slice(1).filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim())).filter((c) => c[0] !== '区分' && /^\d+$/.test(c[1] || ''))
    .map(([label, n]) => ({ label, n: Number(n) }));
}

function aiCommand(st) {
  return `/e2e-workflow ${st.screen} の結合テストを進めたい`;
}

function cmdBox(text) {
  return `<span class="cmd"><code>${esc(text)}</code><button type="button" data-copy="${esc(text)}">コピー</button></span>`;
}

function stepper(st, { compact = false, viewing = null, linkSlug = null } = {}) {
  const cur = currentStage(st);
  if (compact) {
    return `<div class="segs">${STAGES.map((s) => {
      const x = st.stages[s.key];
      return `<div class="seg st-${esc(x.status)}${cur && cur.key === s.key ? ' current' : ''}"><span class="seg-bar"></span><span class="seg-label">${esc(s.label)}</span><span class="seg-state">${esc(STATUS[x.status])}</span></div>`;
    }).join('')}</div>`;
  }
  return `<ol class="stepper${compact ? ' compact' : ''}">${STAGES.map((s, i) => {
    const x = st.stages[s.key];
    const cls = ['step', `st-${x.status}`, x.status === 'confirmed' ? 'done' : '', cur && cur.key === s.key ? 'current' : '', viewing === s.key ? 'viewing' : ''].filter(Boolean).join(' ');
    const name = s.label.replace(/^\d+\s*/, '');
    const meta = compact ? '' : `<div class="step-meta">${esc(STATUS[x.status])}</div>${x.updated_at ? `<div class="step-meta">${esc(formatTime(x.updated_at))}</div>` : ''}`;
    const inner = `<span class="dot">${x.status === 'confirmed' ? '✓' : i + 1}</span><span class="step-body"><div class="step-name">${esc(name)}</div>${meta}</span>${i < STAGES.length - 1 ? '<span class="step-line"></span>' : ''}`;
    const canView = linkSlug && s.artifact && x.status !== 'not_started';
    return `<li class="${cls}" title="${esc(`${s.label}：${STATUS[x.status]}`)}">${canView ? `<a class="step-inner" href="/screen/${esc(linkSlug)}?stage=${esc(s.key)}">${inner}</a>` : `<div class="step-inner">${inner}</div>`}</li>`;
  }).join('')}</ol>`;
}

function indexPage() {
  const states = listStates();
  const ok = states.filter((s) => !s.error);
  const nas = ok.map((s) => nextAction(s));
  const count = (who) => nas.filter((n) => n.who === who).length;
  const stats = `<div class="stats">
<div class="stat"><div class="stat-num">${ok.length}</div><div class="stat-label">ワークフローを始めた画面</div></div>
<div class="stat learner"><div class="stat-num">${count('学習者')}</div><div class="stat-label">学習者の番（レビュー待ち）</div></div>
<div class="stat ai"><div class="stat-num">${count('AI')}</div><div class="stat-label">AI の番（出力や修正を待つ）</div></div>
<div class="stat ok"><div class="stat-num">${nas.filter((n) => !n.stage).length}</div><div class="stat-label">4つの段階がすべて確定</div></div>
</div>`;
  // 学習者の番を先に、次に AI の番、完了は最後に並べる
  const order = { 学習者: 0, AI: 1 };
  const cards = states.map((st, i) => ({ st, na: st.error ? null : nas[ok.indexOf(st)] }))
    .sort((a, b) => (a.na ? order[a.na.who] ?? 2 : 3) - (b.na ? order[b.na.who] ?? 2 : 3))
    .map(({ st, na }) => {
      if (!na) return `<div class="screen-card"><div><div class="screen-name">${esc(st.slug)}</div></div><div class="card-next">読み込めません：${esc(st.error)}</div></div>`;
      const name = screenName(st.slug);
      return `<a class="screen-card turn-${turnClass(na.who)}" href="/screen/${esc(st.slug)}">
<div class="card-top"><div class="card-title"><div class="screen-name">${esc(name || st.screen)}</div>${name ? `<div class="screen-path">${esc(st.screen)}</div>` : '<div class="screen-path">観点一覧はまだありません</div>'}</div>
<div class="card-next">${whoChip(na.who)}<span>${esc(na.text)}</span></div></div>
${stepper(st, { compact: true })}</a>`;
    }).join('');
  const body = `<h1>画面ごとの状態</h1>
<p class="subtitle">結合テストは、試験観点、試験ケース、テストコード、実行の4つの段階で進めます。画面を選ぶと、成果物のレビューと関門の判断ができます。</p>
${states.length ? `${stats}<div class="screens">${cards}</div>`
    : `<div class="panel empty"><h2>まだワークフローを始めた画面がありません</h2><p class="muted">Claude Code で次のように打つと始まります。</p>${cmdBox('/e2e-workflow 予約申請画面（/reservations/new）の結合テストを進めたい')}</div>`}`;
  return page('結合テストのワークフロー', body, { narrow: true });
}

function gatePanel(st, slug, cur, questions, counts) {
  const status = st.stages[cur.key].status;
  const saved = st.stages[cur.key].answers || {};
  const facts = counts.length ? `<dl class="facts">${counts.map((c) => `<div class="fact"><dt>${esc(c.label)}</dt><dd>${c.n}</dd></div>`).join('')}</dl>` : '';
  if (status === 'returned') {
    const r = lastReturn(st, cur.key);
    return `<div class="panel" id="decision"><div class="gate-title"><h2>${esc(cur.gate)}</h2>${badge(status)}<button type="button" class="btn btn-ghost drawer-close" data-drawer="close" style="padding:3px 10px;font-size:12px">閉じる</button></div>
<p class="muted">差し戻し中です。AI が直すと、もう一度「レビュー待ち」になります。</p>
${r ? `<label class="field">差し戻した内容 <span class="hint">${esc(formatTime(r.at))}</span></label><div class="note-box">${esc(r.note)}</div>` : ''}
<p class="muted" style="margin:10px 0 0">AI に直させる方法は、上の「次にやること」にあります。</p>${facts}</div>`;
  }
  if (status !== 'ai_output') {
    return `<div class="panel" id="decision"><div class="gate-title"><h2>${esc(cur.gate)}</h2>${badge(status)}</div>
<p class="muted">AI がこの段階の成果物を出力すると、ここで確定か差し戻しを選べます。</p>${facts}</div>`;
  }
  const ready = questions.every((q) => isReflected(q, saved));
  const nRef = questions.filter((q) => isReflected(q, saved)).length;
  const nAns = questions.filter((q) => saved[q.id]).length;
  return `<form class="panel" id="decision" method="post" action="/api/${esc(slug)}/${esc(cur.key)}/decision">
<div class="gate-title"><h2>${esc(cur.gate)}</h2>${badge(status)}<button type="button" class="btn btn-ghost drawer-close" data-drawer="close" style="padding:3px 10px;font-size:12px">閉じる</button></div>
<p class="muted" style="margin-top:0">観点一覧を仕様書と突き合わせてから、確定か差し戻しを選びます。</p>
${facts}
${questions.length ? `<a class="ans-sum${ready ? ' ok' : ''}" href="#answers"><span>仕様の食い違いへの回答</span><strong>${nAns}／${questions.length} 件回答・${nRef} 件反映</strong></a>` : ''}
<label class="field" for="note">指摘 <span class="hint">直してほしい点を、観点の ID を添えて書く</span></label>
<textarea id="note" name="note" placeholder="例：RSV-NEW-EX-004 の除外に反対。この画面の入り口なので観点に戻してほしい"></textarea>
<div class="gate-actions"><div class="actions">
<button class="btn btn-return" name="action" value="return">差し戻す</button>
<button class="btn btn-confirm" name="action" value="confirm"${ready ? '' : ' disabled'}>確定する</button>
</div>
${ready ? '<p class="muted" style="margin:8px 0 0">確定すると次の段階へ進みます。確定と差し戻しは記録に残ります。</p>' : '<p class="why-disabled">仕様の食い違いに回答して差し戻し、AI が観点一覧に反映するまでは確定できません。</p>'}</div>
</form>`;
}

/** 観点一覧を全幅にしている間、関門の欄のかわりに画面の下に出す帯。 */
function focusBar(st, cur, questions, counts) {
  const status = st.stages[cur.key].status;
  const saved = st.stages[cur.key].answers || {};
  const ready = questions.every((q) => isReflected(q, saved));
  const n = counts.find((c) => /^試験観点/.test(c.label))?.n;
  const meta = [n !== undefined ? `試験観点 <strong>${n}</strong> 件` : '', questions.length ? `食い違いへの回答 <strong>${questions.filter((q) => saved[q.id]).length}／${questions.length}</strong>・反映 <strong>${questions.filter((q) => isReflected(q, saved)).length}</strong>` : ''].filter(Boolean).join('　');
  const buttons = status === 'ai_output'
    ? `<button type="button" class="btn btn-ghost" data-drawer="open">指摘を書く</button>
<button class="btn btn-return" form="decision" name="action" value="return">差し戻す</button>
<button class="btn btn-confirm" form="decision" name="action" value="confirm"${ready ? '' : ' disabled title="仕様の食い違いへの回答が観点一覧に反映されるまでは確定できません"'}>確定する</button>`
    : '<button type="button" class="btn btn-ghost" data-drawer="open">関門の欄を開く</button>';
  return `<div class="focus-bar" aria-label="関門の操作"><div class="focus-bar-in"><span class="fb-title">${esc(cur.gate)}</span>${badge(status)}<span class="fb-meta">${meta}</span>${status === 'ai_output' && !ready ? '<span class="fb-warn">回答が観点一覧に反映されるまで確定できません</span>' : ''}<span class="fb-spacer"></span>${buttons}</div></div>`;
}

/** 仕様の食い違いへの回答欄。観点一覧の上に全幅で置き、入力は右の関門のフォームに属させる（form 属性）。 */
function answersPanel(st, cur, questions) {
  const saved = st.stages[cur.key].answers || {};
  return `<section class="panel answers" id="answers">
<div class="gate-title"><h2>仕様の食い違いへの回答</h2><span class="muted">${questions.filter((q) => isReflected(q, saved)).length}／${questions.length} 件が観点一覧に反映済み</span></div>
<p class="muted" style="margin-top:0">文書どうしで食い違っている点です。仕様書を変えないチュートリアルなので、どちらを正とするかを仮に決めます。どちらを選んでも誤りではありません。選んだら「${esc(cur.gate)}」の「差し戻す」を押すと、AI が観点一覧に反映します。</p>
${questions.map((q) => {
    const reflected = isReflected(q, saved);
    const state = reflected ? '<span class="q-state ok">✓ 観点一覧に反映済み</span>'
      : saved[q.id] ? '<span class="q-state wait">回答は保存済み。差し戻すと AI が反映します</span>'
        : '<span class="q-state none">未回答</span>';
    return `<div class="q${reflected ? '' : ' need'}"><div class="q-head"><span class="q-id">${esc(q.id)}</span><span class="q-text">${esc(q.question)}</span>${state}</div>
<div class="choices">${q.choices.map((c) => `<label class="choice"><input type="radio" form="decision" name="answer:${esc(q.id)}" value="${esc(c.key)}"${saved[q.id]?.choice === c.key ? ' checked' : ''}><span><strong>${esc(c.key)}.</strong> ${esc(c.text)}</span></label>`).join('')}</div>
<p class="q-impact"><strong>影響する観点：</strong>${esc(q.impact)}</p></div>`;
  }).join('')}
</section>`;
}

function timeline(st) {
  const ACT = { init: '開始', ai_output: 'AI が出力', confirm: '確定', return: '差し戻し' };
  return `<ul class="timeline">${st.log.slice().reverse().map((l) => {
    const stage = STAGES.find((s) => s.key === l.stage)?.label || '';
    return `<li class="tl by-${l.by === 'learner' ? 'learner' : 'ai'} act-${esc(l.action)}"><span class="tl-dot"></span><div>
<div class="tl-head"><span class="tl-act">${esc(ACT[l.action] || l.action)}</span><span class="muted">${esc(l.by === 'learner' ? '学習者' : 'AI')}${stage ? `・${esc(stage)}` : ''}</span><span class="tl-time">${esc(formatTime(l.at))}</span></div>
${l.note ? `<div class="tl-note">${esc(l.note)}</div>` : ''}</div></li>`;
  }).join('')}</ul>`;
}

function screenPage(slug, viewKey) {
  const st = readState(slug);
  if (!st) return null;
  const cur = currentStage(st);
  const na = nextAction(st);
  const view = STAGES.find((s) => s.key === viewKey && s.artifact) || cur;
  const name = screenName(slug);

  let artifactHtml = '';
  let questions = [];
  let counts = [];
  if (view) {
    const ap = artifactPath(slug, view.key);
    if (ap && fs.existsSync(ap)) {
      const md = fs.readFileSync(ap, 'utf8');
      if (view.key === 'perspectives') { questions = parseDiscrepancies(md); counts = summaryCounts(md); }
      const saved = st.stages[view.key].answers || {};
      const attn = questions.some((q) => !isReflected(q, saved)) ? '1' : '0';
      const cnt = (re) => counts.find((c) => re.test(c.label))?.n ?? '';
      artifactHtml = `<section class="panel">
<div class="doc-head"><div><h2 style="margin:0">${esc(view.label.replace(/^\d+\s*/, ''))}の成果物</h2><div class="doc-path">${esc(path.relative(process.cwd(), ap).startsWith('..') ? ap : path.relative(process.cwd(), ap))}</div><div class="muted" style="margin-top:2px">読み取り専用。直してほしい点は「${esc(view.gate)}」の指摘に書く</div></div><div class="doc-tools"><span class="muted layout-switch-label">表示の幅</span><div class="layout-switch" role="group" aria-label="表示の幅"><button type="button" data-layout="auto" title="1〜3章を読んでいる間は観点一覧を全幅にする">自動</button><button type="button" data-layout="wide">常に全幅</button><button type="button" data-layout="split">常に2列</button></div></div></div>
<nav class="toc" id="toc" data-attn="${attn}" data-count-2="${cnt(/^試験観点/)}" data-count-3="${cnt(/確認しない/)}" data-count-4="${cnt(/食い違い/)}"></nav>
<div id="artifact" class="pending"><p class="loading">観点一覧を表示しています…</p><pre>${esc(md)}</pre></div>
<textarea id="artifact-src" hidden>${esc(md)}</textarea></section>`;
    } else if (ap) {
      artifactHtml = `<section class="panel"><h2>まだ成果物がありません</h2><p class="muted">AI が出力すると、ここに表示されます。AI への頼み方は、上の「次にやること」にあります。</p></section>`;
    } else {
      artifactHtml = `<section class="panel"><h2>${esc(view.label.replace(/^\d+\s*/, ''))}の成果物</h2><p>この段階の成果物の形と置き場所は、まだ決まっていません。手順は <code>${esc(view.guide)}</code> を参照してください。</p>
${STAGES[0].key !== view.key && st.stages.perspectives.status === 'confirmed' ? `<p><a class="btn btn-ghost" href="/screen/${esc(slug)}?stage=perspectives">確定した試験観点を見る</a></p>` : ''}</section>`;
    }
  }

  const nextBox = `<div class="next ${turnClass(na.who)}">${whoChip(na.who)}<div style="min-width:0">
<div class="next-label">次にやること</div>
<div class="next-text">${esc(na.stage ? na.text : 'すべての段階が確定しました')}</div>
${na.who === 'AI' ? `<div class="next-actions">${cmdBox(aiCommand(st))}</div>` : ''}
</div></div>`;

  const showGate = cur && view && view.key === cur.key;
  const gate = showGate ? gatePanel(st, slug, cur, questions, counts) : '';
  const answers = showGate && st.stages[cur.key].status === 'ai_output' && questions.length ? answersPanel(st, cur, questions) : '';
  const bar = showGate && artifactHtml.includes('id="artifact"') ? focusBar(st, cur, questions, counts) : '';
  const viewingOther = view && cur && view.key !== cur.key;
  const body = `<h1>${esc(name || st.screen)}</h1>
${name ? `<p class="subtitle"><code>${esc(st.screen)}</code></p>` : "<p class=\"subtitle\">観点一覧ができると、画面名が表示されます。</p>"}
<div class="panel status">${stepper(st, { viewing: view?.key, linkSlug: slug })}${nextBox}</div>
${viewingOther ? `<p class="muted">確定済みの「${esc(view.label)}」を表示しています。<a href="/screen/${esc(slug)}">今の段階に戻る</a></p>` : ''}
<div class="layout" id="layout"><div>${answers}${artifactHtml}</div>
<aside class="aside">${gate}</aside></div>
<section class="panel"><h2>記録</h2>${timeline(st)}</section>
${showGate && st.stages[cur.key].status === 'ai_output' ? '<a class="btn jump" href="#decision">判断の入力へ ↓</a>' : ''}
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
${bar}
<script>${RENDER_JS}</script>
<script>${FOCUS_JS}</script>`;
  return page(`${name || st.screen}｜結合テストのワークフロー`, body, { crumb: esc(name || st.screen) });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) reject(new Error('too large')); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function send(res, code, body, type = 'text/html; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}

function messagePage(title, html, slug) {
  return page(title, `<div class="panel" style="max-width:720px"><h2>${esc(title)}</h2>${html}${slug ? `<p><a class="btn btn-ghost" href="/screen/${esc(slug)}">画面に戻る</a></p>` : '<p><a class="btn btn-ghost" href="/">一覧に戻る</a></p>'}</div>`, { narrow: true });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, indexPage());
    let m = url.pathname.match(/^\/screen\/([a-z0-9-]+)$/);
    if (req.method === 'GET' && m) {
      const html = screenPage(m[1], url.searchParams.get('stage'));
      return html ? send(res, 200, html) : send(res, 404, messagePage('見つかりません', '<p>その画面の状態ファイルがありません。</p>'));
    }
    m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/([a-z]+)\/decision$/);
    if (req.method === 'POST' && m) {
      const form = new URLSearchParams(await readBody(req));
      try {
        const answers = Object.fromEntries([...form.entries()].filter(([k]) => k.startsWith('answer:')).map(([k, v]) => [k.slice(7), v]));
        recordDecision(m[1], m[2], form.get('action') || '', form.get('note') || '', answers);
      } catch (e) {
        return send(res, 400, messagePage('操作できません', `<p>${esc(e.message)}</p>`, m[1]));
      }
      res.writeHead(303, { Location: `/screen/${m[1]}` });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/api/states') return send(res, 200, JSON.stringify(listStates()), 'application/json; charset=utf-8');
    return send(res, 404, messagePage('見つかりません', '<p>ページがありません。</p>'));
  } catch (e) {
    return send(res, 500, messagePage('エラー', `<pre>${esc(e.stack || e.message)}</pre>`));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`結合テストのワークフロー: http://localhost:${PORT}（対象: ${baseDir()}）`);
  console.log('VS Code の「ポート」タブで転送し、手元のブラウザで開いてください。');
});

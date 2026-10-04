#!/usr/bin/env node
/**
 * 結合テストのワークフローのダッシュボード。
 *
 * 画面ごとの状態（Docs/test/<スラッグ>/state.json）を一覧し、3つの段階（試験観点、試験ケース、テストコードと実行）の
 * 成果物と実行の証拠を表示して、学習者が仕様の食い違いに回答し、関門で「確定」か「差し戻し」を選ぶための画面を出す。
 * 「確定」と「差し戻し」、回答を状態ファイルに書けるのは、この画面のフォームからの送信だけにしている
 * （起動のたびに変わる合言葉をフォームに埋め、送信のときに照らし合わせる）。
 *
 * 使い方:
 *   node scripts/e2e-workflow/server.mjs            # http://localhost:3130
 *   PORT=3131 node scripts/e2e-workflow/server.mjs
 *   E2E_WORKFLOW_DIR=/path/to/dir node scripts/e2e-workflow/server.mjs
 *
 * devcontainer 内で起動し、VS Code のポート転送で手元のブラウザから開く。
 * 依存パッケージは使わない（Node の標準モジュールだけ）。Markdown の描画だけ CDN の marked と DOMPurify を使い、
 * 読めない環境では生のテキストを表示する。
 */
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  STAGES, STATUS, baseDir, listStates, readState, artifactPath, currentStage, nextAction, recordDecision,
  formatTime, parseDiscrepancies, isReflected, lastReturn, coverageOf, codeCoverageOf, specPath, chapter, tableRows,
  evidenceDir, specHash, usesWorkflowTest, RESULT_KINDS, resultKind, runCheck, changedAfterConfirm, runPath, readTriage, handoffProblems,
  JUDGE_KINDS, failedCaseIds, specChecks,
} from './state.mjs';

// 段階ごとの表示の設定。wide は読んでいる間に全幅にする章、toc は目次に件数を出す章と集計の区分
const VIEW = {
  perspectives: {
    wide: ['ch-1', 'ch-2', 'ch-3'], wideLabel: '1〜3章', toc: { 2: /^試験観点/, 3: /確認しない/, 4: /食い違い/ }, bar: [/^試験観点/, '試験観点'],
    lead: '観点一覧を仕様書と突き合わせてから、確定か差し戻しを選びます。', hint: '直してほしい点を、観点の ID を添えて書く',
    placeholder: '例：RSV-NEW-EX-004 の除外に反対。この画面の入り口なので観点に戻してほしい', noun: '観点一覧',
  },
  cases: {
    wide: ['ch-2', 'ch-3'], wideLabel: '2〜3章', toc: { 2: /^試験ケース$/, 3: /仮に決めた/, 4: /ケースにできなかった/ }, bar: [/^試験ケース$/, '試験ケース'],
    lead: 'すべての試験ケースを、展開元の観点と突き合わせてから、確定か差し戻しを選びます。', hint: '直してほしい点を、試験ケースの ID を添えて書く',
    placeholder: '例：RSV-NEW-TC-012 の終了日時が境界の値になっていない。開始日時と同じにしてほしい', noun: '試験ケース一覧',
  },
  // テストコードと実行の段階。説明（code.md）を読み、そのあとケースごとの結果（実行の証拠）を全幅で見る
  code: {
    wide: ['ch-ev'], wideLabel: 'ケースごとの結果', toc: { 2: /名前が違う/, 3: /ケースどおり/, 4: /テストコードにできなかった/ }, bar: [/^パス$/, 'パス'],
    lead: 'テストコードは読みません。説明の2〜4章を判断し、ケースごとに、使った値を手がかりに証拠の画面を見て期待結果が本当に成り立っているかを判断します。フェイルしたケースは、証拠の表の各ケースで原因を選び、根拠を書きます。AI の見立ては手がかりで、判断するのは学習者です。', hint: '直してほしい点を、試験ケースの ID を添えて書く。フェイルしたケースの原因と根拠は、証拠の表の各ケースで書く',
    placeholder: '例：RSV-NEW-TC-009 の証拠の画面が申請フォームで、マイ予約一覧が写っていない。申請できなかったことが確かめられない', noun: 'テストコードの説明と実行の証拠',
  },
};
const viewOf = (key) => VIEW[key] || VIEW.perspectives;

/** 実行の証拠（run.json）を読む。なければ null。 */
function readRun(slug) {
  const rp = runPath(slug);
  if (!rp || !fs.existsSync(rp)) return null;
  try {
    const run = JSON.parse(fs.readFileSync(rp, 'utf8'));
    return { ...run, cases: run.cases || {}, totals: run.totals || {} };
  } catch { return null; }
}

/** 試験ケース一覧の2章を、分類ごとのケースの行にする。 */
function caseGroups(slug) {
  const cp = artifactPath(slug, 'cases');
  if (!cp || !fs.existsSync(cp)) return [];
  // 分類の見出し（###）より前に置かれた表のケースも落とさない（確定のチェックは2章全体を見るため）
  const parts = chapter(fs.readFileSync(cp, 'utf8'), 2).split(/^### /m);
  return [{ title: '', body: parts[0] }, ...parts.slice(1).map((g) => ({ title: g.split('\n')[0].trim(), body: g }))]
    .map((g) => ({ title: g.title, rows: tableRows(g.body).filter((r) => /-TC-\d{3}$/.test(r.ID || '')) }))
    .filter((g) => g.rows.length);
}

/** 実行の証拠を、試験ケースの期待結果と並べた表。学習者はテストコードを読まずに、これで判断する。 */
function runSection(slug, run, { judge = false } = {}) {
  const stale = run.specHash !== specHash(slug);
  const unwritten = new Set();
  const mp = artifactPath(slug, 'code');
  if (mp && fs.existsSync(mp)) for (const r of tableRows(chapter(fs.readFileSync(mp, 'utf8'), 4))) for (const id of (r['ケース ID'] || '').match(/[A-Z][A-Z0-9-]*-TC-\d{3}/g) || []) unwritten.add(id);
  const kindOf = Object.fromEntries(RESULT_KINDS.map((k) => [k.key, k]));
  const chip = (st) => ({ passed: '<span class="res res-ok">パス</span>', failed: '<span class="res res-ng">フェイル</span>' }[st] || '<span class="res">実行されていない</span>');
  // 絞り込みのための印。行ごとに、結果の区分と、使った値の有無などを持たせる
  const tally = {};
  // AI の見立て。別の実行への見立てなら、古いと示す
  const tri = readTriage(slug);
  const triStale = !!tri && tri.runId !== run.runId;
  // テストコードから機械的に抜き出した、テストごとの確かめ（expect）。説明は AI が書いた文、照合の種類は機械的に決めた言葉
  const sp = specPath(slug);
  const tests = sp && fs.existsSync(sp) ? specChecks(fs.readFileSync(sp, 'utf8')) : {};
  const checkList = (id) => {
    const t = tests[id];
    if (!t) return '';
    if (!t.checks.length) return '<div class="ev-none">このテストの中に、確かめ（expect）が見つからない</div>';
    return `<div class="checks"><div class="checks-k">このテストが確かめたこと</div><ul>${t.checks.map((k) => `<li><span class="chk-msg">${k.message ? esc(k.message) : '<span class="ev-none">（説明なし）</span>'}</span><span class="chk-how">照合：${esc(k.check)}</span></li>`).join('')}</ul></div>`;
  };
  const errList = (c) => {
    const errs = (c.errors || []).filter((e) => e && typeof e === 'object');
    if (!errs.length) return c.error ? `<div class="res-err">${esc(c.error)}</div>` : '';
    // 表示されているかの照合は、Playwright が英語の語（visible、hidden）で書くので、日本語にする
    const word = (v) => ({ visible: '表示されている', hidden: '表示されていない', enabled: '押せる', disabled: '押せない' }[v] || v || '－');
    return errs.map((e) => `<div class="res-err">${esc(e.message.replace(/^Error:\s*/, ''))}${e.expected || e.received ? `<span class="res-er">（期待：${esc(word(e.expected))}／実際：${esc(word(e.received))}）</span>` : ''}</div>`).join('');
  };
  const tag = (t) => { tally[t] = (tally[t] || 0) + 1; return t; };
  // 見る場所の列は、以前の様式では「確かめ方」という名前だった
  const where = (r) => r['見る場所'] ?? r['確かめ方'] ?? '';
  const valueList = (vals) => (vals && vals.length ? `<dl class="used">${vals.map((v) => `<dt>${esc(v.label)}</dt><dd>${esc(v.value)}</dd>`).join('')}</dl>` : '');
  const img = (e, r, vals) => `<figure class="ev"><a class="ev-open" href="/evidence/${esc(slug)}/${encodeURIComponent(e.file)}" target="_blank" rel="noopener" data-id="${esc(r.ID)}" data-label="${esc(e.label)}" data-exp="${esc(r['期待結果'])}" data-obs="${esc(where(r))}" data-values="${esc(JSON.stringify(vals || []))}"><img src="/evidence/${esc(slug)}/${encodeURIComponent(e.file)}" alt="${esc(e.label)}" loading="lazy"></a><figcaption>${esc(e.label)}</figcaption></figure>`;
  const rows = caseGroups(slug).map((g) => `${g.title ? `<tr class="grp"><th colspan="4">${esc(g.title)}</th></tr>` : ''}${g.rows.map((r) => {
    const c = run.cases[r.ID];
    let result; let ev; let used = '';
    const tags = [];
    if (!c) {
      tags.push(tag(unwritten.has(r.ID) ? 'unwritten' : 'missing'));
      result = unwritten.has(r.ID) ? '<span class="res">テストにしなかったケース</span>' : '<span class="res res-ng">テストがない</span>';
      ev = '';
    } else {
      const kind = kindOf[resultKind(c)];
      tags.push(tag(kind.key));
      if (kind.fail) tags.push(tag('fail'));
      const shot = c.evidence.some((e) => e.kind === 'evidence');
      if (kind.key === 'pass' && !shot) tags.push(tag('noshot'));
      result = `${chip(c.status)}${kind.fail ? `<div class="res-kind" title="${esc(kind.note)}">${esc(kind.label)}</div>` : ''}${errList(c)}`;
      ev = `${c.evidence.length ? `<div class="ev-list">${c.evidence.map((e) => img(e, r, c.values)).join('')}</div>` : ''}${kind.key === 'pass' && !shot ? '<div class="ev-none">見る場所の画面がない（テストが画面を撮っていない）</div>' : ''}`;
      // 値を入れないケース（画面を開くだけなど）もあるので、記録がなければ何も出さない
      if (c.values && c.values.length) used = `<div class="used-box"><div class="used-k">このテストで使った値</div>${valueList(c.values)}</div>`;
      if (kind.fail) {
        const t = tri?.rows[r.ID];
        used += t
          ? `<div class="ai-note"><div class="ai-k"><span class="ai-chip">AI の見立て</span>${esc(t.kind || t.text)}${triStale ? '<span class="ai-stale">前の実行への見立て</span>' : ''}</div>${t.reason ? `<div class="ai-reason">${esc(t.reason)}</div>` : ''}</div>`
          : '<div class="ev-none">AI の見立てがない</div>';
        // 学習者の判断。入力は関門の欄のフォームに属させる（form 属性）。AI の見立てで埋めておくことはしない
        if (judge) {
          used += `<div class="judge" data-id="${esc(r.ID)}"><div class="judge-k">あなたの判断</div><select name="judge:${esc(r.ID)}" form="decision" aria-label="${esc(r.ID)} の原因"><option value="">原因を選ぶ</option>${JUDGE_KINDS.map((k) => `<option value="${esc(k.key)}" data-confirm="${k.confirm ? '1' : '0'}" title="${esc(k.note)}">${esc(k.label)}</option>`).join('')}</select><input type="text" name="basis:${esc(r.ID)}" form="decision" maxlength="500" placeholder="根拠：見た証拠や仕様（例：証拠1がエラー画面。仕様は重複のメッセージ）" aria-label="${esc(r.ID)} の根拠"></div>`;
        }
      }
    }
    return `<tr id="case-${esc(r.ID)}" data-tags="${tags.join(' ')}"><td class="chk-id">${esc(r.ID)}</td><td class="chk-exp"><div class="chk-expect">${esc(r['期待結果'])}</div><div class="chk-obs"><strong>見る場所：</strong>${esc(where(r))}</div>${c ? checkList(r.ID) : ''}${used}</td><td class="res-cell">${result}</td><td class="ev-cell">${ev}</td></tr>`;
  }).join('')}`).join('');
  const t = run.totals || {};
  // 絞り込みのボタン。0 件の区分は出さない
  const filters = [
    ['all', 'すべて', Object.keys(run.cases).length + (tally.unwritten || 0) + (tally.missing || 0)],
    ['pass', 'パス', tally.pass],
    ['fail', 'フェイル（すべて）', tally.fail],
    ...RESULT_KINDS.filter((k) => k.fail).map((k) => [k.key, `フェイル：${k.label}`, tally[k.key]]),
    ['not_run', '実行されていない', tally.not_run],
    ['noshot', '見る場所の画面がない', tally.noshot],
    ['unwritten', 'テストにしなかったケース', tally.unwritten],
    ['missing', 'テストがない', tally.missing],
  ].filter(([key, , n]) => key === 'all' || n);
  const filterBar = `<div class="rfilter" role="group" aria-label="結果で絞り込む"><span class="rfilter-k">絞り込み</span>${filters.map(([key, label, n], i) => `<button type="button" data-filter="${key}" aria-pressed="${i === 0}">${esc(label)}<span class="rfilter-n">${n}</span></button>`).join('')}<span class="rfilter-shown" aria-live="polite"></span></div>`;
  const legend = `<details class="rlegend"><summary>フェイルの区分の見分け方</summary><dl>${RESULT_KINDS.filter((k) => k.fail).map((k) => `<dt>${esc(k.label)}</dt><dd>${esc(k.note)}</dd>`).join('')}</dl><p class="muted">区分は、テストがどこで止まったかを機械的に分けたものです。実装の不具合か、テストの誤りかは、画面を見て判断します。</p></details>`;
  return `<section class="panel" id="evidence"><div class="doc-head"><div><h2 style="margin:0">実行の証拠</h2><div class="doc-path">${esc(formatTime(run.runAt))} に実行。テスト ${t.tests ?? 0} 件、パス ${t.passed ?? 0} 件、フェイル ${t.failed ?? 0} 件</div></div></div>
${stale ? '<div class="stale">テストコードが、この実行のあとで変わっています。この証拠は古いので、確定する前にもう一度実行してください。</div>' : ''}
<p class="muted" style="margin-top:0">結果と証拠の画面は、実行から機械的に集めたものです。フェイルしたケースの「AI の見立て」だけは AI が書いたもので、判断するのは学習者です。フェイルしたケースは「あなたの判断」で原因を選び、根拠を書きます。すべてそろうまで確定できません。証拠の画面は、テストが期待結果を確かめた場所で、実行中に撮ったものです。ケースごとに、「見る場所」が写っているか、その画面で期待結果が成り立っているかを見ます。画面のどの行を見ればよいかは、「このテストで使った値」（テストが実際に入れた利用目的、リソース、日時など）で探します。「このテストが確かめたこと」は、テストコードから機械的に抜き出した確かめで、説明の文は AI が書き、「照合」は機械的に決めた言葉です。期待結果と照らして、確かめが足りているか、説明と照合が食い違っていないかを見ます。証拠の画面は今回の実行の様子しか示さないので、確かめが足りないテストは、今回たまたま正しく動いていてもパスします。パスしたテストも見ます。画像を押すと大きく開きます。</p>
<div id="evidence-body"><h2 id="ch-ev" class="ev-h">ケースごとの結果</h2>${filterBar}${legend}
<div class="table-wrap"><table class="chk-table"><thead><tr><th>ケース ID</th><th>期待結果（試験ケース）</th><th>結果</th><th>証拠の画面</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>
<dialog id="ev-dialog"><div class="evd"><div class="evd-side"><div class="q-id" id="evd-id"></div><div class="evd-k">期待結果</div><div class="evd-exp" id="evd-exp"></div><div class="evd-k">見る場所</div><div class="evd-obs" id="evd-obs"></div><div class="evd-k" id="evd-values-k">このテストで使った値</div><div id="evd-values"></div><div class="evd-k">この画面</div><div id="evd-label"></div><p class="muted">この画面で、期待結果が成り立っているかを見ます。</p><button type="button" class="btn btn-ghost" id="evd-close">閉じる（Esc）</button></div><div class="evd-img"><img id="evd-img" alt=""></div></div></dialog>`;
}

/**
 * テストコードの決まり（要素の指定、待ち方、確かめの説明、証拠の画面など）から外れた書き方を、機械的に見つける。確定は止めない。
 * 見つかったら、学習者はその文言を差し戻しの理由に貼る（execution.md）。
 */
function lintSpec(src) {
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
  if (noMsg.length) out.push({ label: '確かめ（expect）に、何を確かめるかの説明がない（画面の「このテストが確かめたこと」に出ない）', lines: noMsg });
  const noShot = tests.filter((t) => !t.evidence).map((t) => t.line);
  if (noShot.length) out.push({ label: '見る場所の画面を撮っていないテストがある', lines: noShot });
  if (!usesWorkflowTest(src)) out.push({ label: 'テストごとにデータベースを初期データに戻す test（helpers/workflow-test）を使っていない', lines: [] });
  return out;
}

/**
 * 確定できるかと、できないときの理由。確定のチェック（state.mjs の recordDecision）と同じ条件で決める。
 * 試験観点は回答の反映、試験ケースは観点との対応、テストコードはケースとの対応、実行は全ケースの結果と証拠の新しさで決まる。
 */
function readiness(st, slug, key, questions) {
  if (key === 'perspectives') {
    const saved = st.stages[key].answers || {};
    const ready = questions.every((q) => isReflected(q, saved));
    return { ready, why: '仕様の食い違いに回答して差し戻し、AI が観点一覧に反映するまでは確定できません。', short: '回答が観点一覧に反映されるまで確定できません' };
  }
  if (key === 'cases') {
    const cov = coverageOf(slug);
    if (!cov) return { ready: false, why: '試験ケース一覧がありません。', short: '試験ケース一覧がありません' };
    const ready = !cov.missing.length && !cov.unknown.length;
    const parts = [];
    if (cov.missing.length) parts.push(`どの試験ケースにも、「試験ケースにできなかった観点」にも載っていない観点があります（${cov.missing.join('、')}）。`);
    if (cov.unknown.length) parts.push(`観点一覧にない観点 ID があります（${cov.unknown.join('、')}）。`);
    return { ready, cov: { label: '観点との対応', total: cov.viewpoints, done: cov.viewpoints - cov.missing.length, extra: cov.unexpanded.length ? `うち試験ケースにできなかった ${cov.unexpanded.length} 件` : '' }, why: `${parts.join('')}差し戻して直させるまでは確定できません。`, short: '観点との対応に漏れがあるため確定できません' };
  }
  if (key === 'code') {
    // テストコードと実行の段階：ケースとの対応と、流した結果の両方がそろって確定できる
    const cov = codeCoverageOf(slug);
    if (!cov) return { ready: false, why: 'テストコードかその説明（code.md）がありません。', short: 'テストコードがありません' };
    const covs = [{ label: 'ケースとの対応', total: cov.cases, done: cov.cases - cov.missing.length, extra: cov.unwritten.length ? `うちテストコードにできなかった ${cov.unwritten.length} 件` : '' }];
    const parts = [];
    if (cov.duplicated.length) parts.push(`同じケース ID で始まるテストが2本以上あります（${cov.duplicated.join('、')}）。`);
    if (cov.missing.length) parts.push(`どのテストにも、「テストコードにできなかったケース」にも載っていないケースがあります（${cov.missing.join('、')}）。`);
    if (cov.unknown.length) parts.push(`試験ケース一覧にないケース ID があります（${cov.unknown.join('、')}）。`);
    const chk = runCheck(slug);
    if (!chk.run) parts.push('まだ流していません。');
    else {
      const failed = Object.values(chk.run.cases || {}).filter((c) => RESULT_KINDS.find((k) => k.key === resultKind(c))?.fail).length;
      covs.push({ label: '実行されたケース', total: chk.total, done: chk.total - chk.missing.length - chk.notRun.length - chk.env.length, extra: failed ? `うちフェイル ${failed} 件` : '' });
      if (chk.stale) parts.push('テストコードが、流したあとで変わっています。');
      if (chk.missing.length) parts.push(`実行の結果がないケースがあります（${chk.missing.join('、')}）。`);
      if (chk.notRun.length) parts.push(`実行されていないケースがあります（${chk.notRun.join('、')}）。`);
      if (chk.env.length) parts.push(`環境が整っていなかったケースがあります（${chk.env.join('、')}）。`);
    }
    const ready = !parts.length;
    return { ready, covs, failed: chk.run ? failedCaseIds(chk.run) : [], runId: chk.run?.runId || '', why: ready ? '' : `${parts.join('')}差し戻して直させるか、AI に流し直させるまでは確定できません。`, short: ready ? '' : (chk.run ? 'ケースとの対応か実行の結果に足りないところがあるため確定できません' : 'まだ流していないため確定できません') };
  }
  return { ready: true, why: '', short: '' };
}

const PORT = Number(process.env.PORT || 3130);
// 確定と差し戻しの送信に添える合言葉。起動のたびに変える。この画面のフォームからの送信だけを受け付けるため
const FORM_TOKEN = crypto.randomBytes(16).toString('hex');
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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

/* 段階の進み具合 */
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
#artifact .col-id.id-list { white-space: normal; min-width: 9em; max-width: 13em; }
#artifact .col-main.is-text { font-weight: 500; }
#artifact .col-note { min-width: 8em; color: var(--sub); }
#artifact .col-hide { display: none; }
#artifact .col-exp { min-width: 14em; font-weight: 600; }
#artifact .col-pre { min-width: 11em; color: var(--sub); }
#artifact .col-sub { min-width: 9em; }
#artifact .inline-from { margin-top: 4px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: var(--mute); white-space: nowrap; }
#artifact .inline-from::before { content: "← "; }
#artifact .col-exp .inline-always { font-weight: 400; }
#artifact .pre-inline { margin: 0 0 6px; }
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
#evidence .table-wrap { overflow-x: auto; }
/* 狭い画面では、実行の証拠の表を1ケースずつ縦に積む */
@media (max-width: 640px) {
  #evidence .chk-table, #evidence .chk-table tbody, #evidence .chk-table tr, #evidence .chk-table td, #evidence .chk-table th { display: block; width: auto; }
  #evidence .chk-table thead { display: none; }
  #evidence .chk-table td { border-bottom: 0; padding: 4px 10px; }
  #evidence .chk-table tr { border-bottom: 1px solid var(--line); padding: 6px 0; }
  #evidence .chk-exp { min-width: 0; }
  #evidence figure.ev, #evidence figure.ev img { width: 100%; }
}
.chk-table { border-collapse: separate; border-spacing: 0; width: 100%; background: #fff; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; font-size: 14px; }
.chk-table th, .chk-table td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
.chk-table thead th { background: #f9fafb; font-size: 12px; color: var(--sub); }
.chk-table tr.grp th { background: var(--bg); font-size: 13px; color: var(--sub); }
.chk-id { white-space: nowrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--sub); }
.chk-exp { min-width: 14em; width: 34%; }
.chk-expect { font-weight: 600; }
.chk-obs { margin-top: 4px; font-size: 12px; color: var(--sub); }
.res { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid var(--line-strong); background: var(--idle-bg); color: var(--sub); }
.res-ok { background: var(--ok-bg); border-color: var(--ok-line); color: #15803d; }
.res-ng { background: var(--ng-bg); border-color: var(--ng-line); color: #b91c1c; }
.res-cell { width: 9em; }
.res-err { margin-top: 4px; font-size: 12px; color: #b91c1c; overflow-wrap: anywhere; }
.ev-cell { width: 38%; }
.ev-list { display: flex; flex-wrap: wrap; gap: 8px; }
figure.ev { margin: 0; width: 200px; }
figure.ev img { display: block; width: 200px; max-height: 160px; object-fit: cover; object-position: top; border: 1px solid var(--line-strong); border-radius: 6px; background: #fff; }
figure.ev figcaption { font-size: 12px; color: var(--sub); margin-top: 2px; }
.ev-none { color: #b45309; font-weight: 700; font-size: 13px; }
.used-box { margin-top: 8px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); }
.checks { margin-top: 8px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff; font-size: 13px; }
.checks-k { font-weight: 700; margin-bottom: 2px; }
.checks ul { margin: 0; padding-left: 18px; }
.checks li { margin: 2px 0; }
.chk-how { display: block; color: var(--sub); font-size: 12px; }
.res-er { display: block; color: var(--sub); }
.judge { margin-top: 8px; padding: 8px 10px; border: 1px solid var(--learner-line); background: var(--learner-bg); border-radius: 6px; display: grid; gap: 6px; }
.judge.done { border-color: var(--ok-line); background: var(--ok-bg); }
.judge-k { font-weight: 700; font-size: 13px; }
.judge select, .judge input { width: 100%; font: inherit; font-size: 13px; border: 1px solid var(--line-strong); border-radius: 6px; padding: 5px 8px; background: #fff; }
.judge select:focus, .judge input:focus { outline: 2px solid var(--ai-line); outline-offset: 1px; }
.judge-missing { font-size: 12px; margin: 2px 0 6px; display: flex; flex-wrap: wrap; gap: 4px 8px; }
.judge-missing a { color: var(--learner); }
.judged { list-style: none; margin: 4px 0 10px; padding: 0; font-size: 13px; }
.judged li { padding: 4px 0; border-bottom: 1px solid var(--line); }
.judged .q-id { margin-right: 6px; }
.judged .note { color: var(--sub); }
.ai-note { margin-top: 8px; padding: 6px 10px; border-left: 3px solid var(--ai); background: var(--ai-bg); border-radius: 0 6px 6px 0; font-size: 13px; }
.ai-k { font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ai-chip { font-size: 11px; font-weight: 700; color: #fff; background: var(--ai); border-radius: 999px; padding: 1px 8px; }
.ai-stale { font-size: 11px; color: #b45309; }
.ai-reason { margin-top: 2px; color: var(--sub); overflow-wrap: anywhere; }
.res-kind { margin-top: 4px; font-size: 12px; font-weight: 700; color: #b91c1c; cursor: help; }
.ev-h { font-size: 16px; margin: 12px 0 6px; }
/* 実行の証拠の表は、ケース ID と結果の列を詰め、広げた幅は期待結果と証拠の画面に回す */
#evidence .chk-id { width: 1%; }
#evidence .res-cell { width: 10em; }
#evidence .chk-exp { width: 42%; }
.layout.wide #evidence figure.ev, .layout.wide #evidence figure.ev img { width: 280px; }
.layout.wide #evidence figure.ev img { max-height: 220px; }
.rfilter { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px -4px 8px; padding: 8px 4px; position: sticky; top: 46px; z-index: 10; background: #fff; border-bottom: 1px solid var(--line); }
.done-panel .done-at { font-weight: 700; margin: 4px 0 10px; }
.done-panel ol { margin: 6px 0 0; padding-left: 1.2em; font-size: 13px; }
.done-panel li { margin-bottom: 6px; }
.done-panel li .t { color: var(--mute); font-size: 12px; display: block; }
.done-panel .note { white-space: pre-wrap; overflow-wrap: anywhere; }
.rfilter-k { font-size: 12px; font-weight: 700; color: var(--sub); margin-right: 2px; }
.rfilter button { font: inherit; font-size: 13px; padding: 3px 10px; border: 1px solid var(--line-strong); border-radius: 999px; background: #fff; color: var(--sub); cursor: pointer; }
.rfilter button[aria-pressed="true"] { background: var(--ai); border-color: var(--ai); color: #fff; }
.rfilter-n { margin-left: 6px; font-size: 11px; font-weight: 700; opacity: .85; }
.rfilter-shown { font-size: 12px; color: var(--mute); margin-left: 4px; }
.rlegend { margin: 0 0 10px; font-size: 13px; }
.rlegend summary { cursor: pointer; color: var(--sub); }
.rlegend dl { margin: 6px 0 0; }
.rlegend dt { font-weight: 700; margin-top: 4px; }
.rlegend dd { margin: 0 0 0 1em; }
#evidence tr.is-filtered { display: none; }
.used-k { font-size: 12px; font-weight: 700; color: var(--sub); margin-bottom: 2px; }
dl.used { margin: 0; font-size: 13px; }
dl.used dt { color: var(--sub); font-size: 12px; margin-top: 4px; }
dl.used dt:first-child { margin-top: 0; }
dl.used dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
.evd-side .q-id { margin-bottom: 8px; }
#ev-dialog { width: min(1400px, 96vw); max-height: 92vh; padding: 0; border: 0; border-radius: 12px; box-shadow: 0 24px 60px rgba(17,24,39,.35); }
#ev-dialog::backdrop { background: rgba(15,23,42,.55); }
.evd { display: grid; grid-template-columns: 300px minmax(0, 1fr); max-height: 92vh; }
.evd-side { padding: 18px 20px; border-right: 1px solid var(--line); overflow: auto; font-size: 14px; }
.evd-k { font-size: 12px; font-weight: 700; color: var(--sub); margin: 12px 0 2px; }
.evd-exp { font-weight: 700; }
.evd-img { overflow: auto; background: var(--bg); }
.evd-img img { display: block; width: 100%; height: auto; }
@media (max-width: 900px) { .evd { grid-template-columns: 1fr; overflow: auto; } .evd-side { border-right: 0; border-bottom: 1px solid var(--line); overflow: visible; } }
.stale { border: 1px solid var(--ng-line); background: var(--ng-bg); color: #b91c1c; border-radius: 8px; padding: 8px 12px; font-weight: 700; margin: 8px 0; }
#spec summary { cursor: pointer; }
#spec summary code { font-size: 12px; overflow-wrap: anywhere; }
pre.code { margin: 12px 0 0; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px 0; font-size: 12px; line-height: 1.55; overflow-x: auto; }
pre.code .ln { display: inline-block; width: 3.5em; padding-right: 1em; text-align: right; color: #64748b; user-select: none; }
.lint { border: 1px solid #fde68a; background: #fffbeb; border-radius: 8px; padding: 8px 12px; font-size: 13px; margin: 8px 0 4px; }
.lint ul { margin: 4px 0 0; padding-left: 18px; }

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

// 実行の証拠の絞り込みと拡大表示、判断の入力へのジャンプ、クリップボードへのコピー。テンプレート文字列の中に置くので ` と ${ は使わない
const CLIENT_JS = `
// 実行の証拠の表を、結果の区分で絞り込む
document.addEventListener('click', function (e) {
  var b = e.target.closest('.rfilter button');
  if (!b) return;
  var f = b.getAttribute('data-filter'), shown = 0, rows = document.querySelectorAll('#evidence tbody tr');
  b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  var grp = null, grpHas = false;
  var closeGroup = function () { if (grp) grp.classList.toggle('is-filtered', !grpHas); };
  rows.forEach(function (tr) {
    if (tr.classList.contains('grp')) { closeGroup(); grp = tr; grpHas = false; return; }
    var hit = f === 'all' || (' ' + tr.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') >= 0;
    tr.classList.toggle('is-filtered', !hit);
    if (hit) { shown++; grpHas = true; }
  });
  closeGroup();
  var out = b.parentNode.querySelector('.rfilter-shown');
  if (out) out.textContent = f === 'all' ? '' : shown + ' 件を表示中';
});
// 証拠の画面を、期待結果と並べて大きく開く
document.addEventListener('click', function (e) {
  var d = document.getElementById('ev-dialog');
  if (!d) return;
  if (e.target.id === 'evd-close' || e.target === d) { d.close(); return; }
  var a = e.target.closest('a.ev-open');
  if (!a || !d.showModal) return;
  e.preventDefault();
  document.getElementById('evd-id').textContent = a.dataset.id;
  document.getElementById('evd-exp').textContent = a.dataset.exp;
  document.getElementById('evd-obs').textContent = a.dataset.obs;
  document.getElementById('evd-label').textContent = a.dataset.label;
  var box = document.getElementById('evd-values'), vals = [];
  try { vals = JSON.parse(a.dataset.values || '[]'); } catch (err) { vals = []; }
  box.innerHTML = '';
  // 値を入れないケースでは、使った値の欄ごと出さない
  document.getElementById('evd-values-k').hidden = !vals.length;
  box.hidden = !vals.length;
  if (vals.length) {
    var dl = document.createElement('dl');
    dl.className = 'used';
    vals.forEach(function (v) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = v.label; dd.textContent = v.value; dl.appendChild(dt); dl.appendChild(dd); });
    box.appendChild(dl);
  }
  document.getElementById('evd-img').src = a.href;
  d.showModal();
});
// フェイルしたケースの判断（原因と根拠）。すべてそろい、確定できない原因が選ばれていないときだけ「確定する」を押せる。
// 入力は、画面を読み込み直しても消えないように、このブラウザに一時的に残す（同じ実行の結果の間だけ）
(function () {
  var form = document.getElementById('decision');
  if (!form || !form.dataset.judgeKey) return;
  var key = 'e2e-judge:' + form.dataset.judgeKey;
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.judge'));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (err) { saved = {}; }
  boxes.forEach(function (b) {
    var v = saved[b.dataset.id];
    if (!v) return;
    b.querySelector('select').value = v.kind || '';
    b.querySelector('input').value = v.basis || '';
  });
  var update = function () {
    var done = 0, blocking = [], missing = [], store = {};
    boxes.forEach(function (b) {
      var sel = b.querySelector('select'), basis = b.querySelector('input').value.trim();
      var opt = sel.options[sel.selectedIndex];
      var ok = !!sel.value && !!basis;
      b.classList.toggle('done', ok);
      if (ok) done++; else missing.push(b.dataset.id);
      if (sel.value && opt && opt.getAttribute('data-confirm') === '0') blocking.push(b.dataset.id);
      if (sel.value || basis) store[b.dataset.id] = { kind: sel.value, basis: basis };
    });
    try { localStorage.setItem(key, JSON.stringify(store)); } catch (err) { /* 残せなくても入力はできる */ }
    var total = boxes.length;
    document.querySelectorAll('[data-judge-count]').forEach(function (el) { el.textContent = done + '／' + total + ' 件'; });
    var sum = document.getElementById('judge-sum');
    if (sum) sum.classList.toggle('ok', done === total && !blocking.length);
    var list = document.getElementById('judge-missing');
    if (list) {
      list.textContent = '';
      if (missing.length) {
        list.appendChild(document.createTextNode('まだ：'));
        missing.forEach(function (id) { var a = document.createElement('a'); a.href = '#case-' + id; a.textContent = id; list.appendChild(a); });
      }
    }
    var why = '';
    if (done < total) why = 'フェイルしたケースのうち ' + (total - done) + ' 件に、原因と根拠がそろっていません。証拠の表の「あなたの判断」で選んで書きます。';
    else if (blocking.length) why = '「テストの誤り」か「前の段階の誤り」と判断したケースがあります（' + blocking.join('、') + '）。確定せずに差し戻します。';
    var w = document.getElementById('judge-why');
    if (w) { w.textContent = why; w.hidden = !why; }
    document.querySelectorAll('button[value="confirm"]').forEach(function (btn) { btn.disabled = !!btn.dataset.blocked || !!why; if (why && !btn.dataset.blocked) btn.title = why; });
  };
  document.addEventListener('input', function (e) { if (e.target.closest('.judge')) update(); });
  document.addEventListener('change', function (e) { if (e.target.closest('.judge')) update(); });
  // 確定か差し戻しを送ったら、残しておいた入力を消す
  form.addEventListener('submit', function () { try { localStorage.removeItem(key); } catch (err) { /* 消せなくてもよい */ } });
  update();
})();
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

// 成果物の Markdown の描画（無害化してから入れる）、表の列の役割づけ、章の目次。テンプレート文字列の中に置くので ` と ${ は使わない
const RENDER_JS = `
// 文字を HTML として解釈させずに入れるときに使う（見出しの文字は、無害化したあとの textContent から取るため）
function escHtml(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
(function () {
  var src = document.getElementById('artifact-src');
  var out = document.getElementById('artifact');
  if (!src || !out) return;
  // 成果物は AI が書いた Markdown なので、HTML を無害化してから表示する。読み込めないときは生のテキストのまま見せる
  if (!window.marked || !window.DOMPurify) { out.classList.remove('pending'); var l = out.querySelector('.loading'); if (l) l.remove(); return; }
  out.innerHTML = window.DOMPurify.sanitize(window.marked.parse(src.value));
  out.classList.remove('pending');
  // 列の役割を見出しの文字で決める。列の順番には頼らない
  var ID = ['ID', '#', '観点 ID', 'データ ID', 'ケース ID'];
  var NOWRAP = ['区分'];
  var MAIN = ['仕様の内容', '試験観点', '観点', '質問', '手順と入力', '条件', '決めたこと', '仕様書の名前', 'ケースの記述', '書けなかった理由'];
  var SRC = ['記載元', '仕様根拠', '見た箇所'];
  var NOTE = ['備考', '補足', '使うケース', '注意'];
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
      return ID.indexOf(h) >= 0 ? 'id' : NOWRAP.indexOf(h) >= 0 ? 'nowrap' : MAIN.indexOf(h) >= 0 ? 'main' : SRC.indexOf(h) >= 0 ? 'src' : NOTE.indexOf(h) >= 0 ? 'note' : h === '理由' ? 'reason' : h === '回答' ? 'answer' : h === '展開元' ? 'from' : h === '前提条件' ? 'pre' : h === '期待結果' || h === 'テストコードでの書き方' ? 'exp' : h === '見る場所' || h === '確かめ方' || h === '結果への影響' ? 'obs' : h === '選んだ値' || h === '用意のしかた' || h === '実装の名前' ? 'sub' : h.indexOf('回答の選択肢') === 0 || h === '影響する観点' || h === '選んだ理由' || h === '別の値にするとどうなるか' ? 'wide' : '';
    });
    // 3章のように理由の列がある表では、補足（理由の説明）を観点の下に出し、理由の列に幅を回す
    if (role.indexOf('reason') >= 0) role = role.map(function (x) { return x === 'note' ? 'wide' : x; });
    var main = role.indexOf('main');
    var idCol = role.indexOf('id'), expCol = role.indexOf('exp');
    table.querySelectorAll('tr').forEach(function (tr) {
      var cells = tr.children;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (role[i]) c.classList.add('col-' + role[i]);
        // 試験ケースの表：展開元は ID の下、見る場所は期待結果の下に常に出す
        var into = role[i] === 'from' && idCol >= 0 ? idCol : role[i] === 'obs' && expCol >= 0 ? expCol : -1;
        if (into >= 0) {
          c.classList.add('col-hide');
          if (c.tagName === 'TD' && c.textContent.trim() && cells[into]) {
            var x = document.createElement('div');
            x.className = role[i] === 'from' ? 'inline-from' : 'inline-always';
            x.innerHTML = (role[i] === 'from' ? '' : '<strong>' + escHtml(heads[i]) + '：</strong>') + c.innerHTML;
            cells[into].appendChild(x);
          }
          continue;
        }
        var always = (role[i] === 'wide' || role[i] === 'answer') && main >= 0;
        var inl = (role[i] === 'src' || role[i] === 'pre') && main >= 0;
        if (always) c.classList.add('col-hide');
        if (c.tagName !== 'TD') { if (inl) c.classList.add('has-inline'); continue; }
        var text = c.textContent.trim();
        if (role[i] === 'main') c.classList.add('is-text');
        // ID が複数並ぶセルは、読点のところで折り返す
        if (role[i] === 'id' && /[、〜]/.test(text)) c.classList.add('id-list');
        if (role[i] === 'nowrap' && (text === '確定' || text === '矛盾')) c.innerHTML = '<span class="chip ' + (text === '確定' ? 'ok' : 'ng') + '">' + text + '</span>';
        if (role[i] === 'reason' && REASONS.indexOf(text) >= 0) c.innerHTML = '<span class="chip reason">' + text + '</span>';
        if (role[i] === 'answer' && text) c.classList.add('answered');
        if (always && text && cells[main]) {
          var al = document.createElement('div');
          al.className = 'inline-always' + (role[i] === 'answer' ? ' inline-answer' : '');
          al.innerHTML = '<strong>' + escHtml(heads[i]) + '：</strong>' + c.innerHTML;
          cells[main].appendChild(al);
        }
        if (inl) {
          c.classList.add('has-inline');
          if (cells[main]) {
            var div = document.createElement('div');
            div.className = 'src-inline' + (role[i] === 'pre' ? ' pre-inline' : '');
            div.innerHTML = '<strong>' + escHtml(heads[i]) + '：</strong>' + c.innerHTML;
            // 前提条件は手順の前に読むものなので、本文の先頭に置く
            if (role[i] === 'pre') cells[main].insertBefore(div, cells[main].firstChild); else cells[main].appendChild(div);
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
    a.innerHTML = escHtml(m ? m[1] + '. ' + m[2].replace(/（[^）]*）$/, '') : h.textContent) + (count ? ' <span class="n">' + escHtml(count) + '</span>' : '');
    if (m && m[1] === '4' && toc.getAttribute('data-attn') === '1') a.classList.add('attn');
    toc.appendChild(a);
    links.push([h, a]);
  });
  // テストコードと実行の段階では、説明の章のあとに、実行の証拠（ケースごとの結果）への目次を足す
  var ev = document.getElementById('ch-ev');
  if (toc && ev) {
    var e = document.createElement('a');
    e.href = '#ch-ev';
    e.textContent = '実行の証拠';
    toc.appendChild(e);
    links.push([ev, e]);
  }
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
  // 幅を切り替える目印（章の見出し）は、左の列全体から探す。テストコードと実行の段階では、説明と実行の証拠が並ぶため
  var artifact = layout && layout.firstElementChild;
  if (!layout || !artifact || !artifact.querySelector('#artifact, #evidence-body')) return;
  var WIDE = {};
  (layout.getAttribute('data-wide') || '').split(',').forEach(function (k) { if (k) WIDE[k] = true; });
  var KEY = 'e2e-workflow-layout';
  var pref = 'auto';
  try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  var twoCol = window.matchMedia('(min-width: 1201px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
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
<div class="stat ok"><div class="stat-num">${nas.filter((n) => !n.stage).length}</div><div class="stat-label">すべての段階が確定</div></div>
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
<p class="subtitle">結合テストは、試験観点、試験ケース、テストコードと実行の3つの段階で進めます。画面を選ぶと、成果物のレビューと関門の判断ができます。</p>
${states.length ? `${stats}<div class="screens">${cards}</div>`
    : `<div class="panel empty"><h2>まだワークフローを始めた画面がありません</h2><p class="muted">Claude Code で次のように打つと始まります。</p>${cmdBox('/e2e-workflow 予約申請画面（/reservations/new）の結合テストを進めたい')}</div>`}`;
  return page('結合テストのワークフロー', body, { narrow: true });
}

/** 生成したテストコードの全文。長いので折りたたんで出す。 */
function specSection(slug) {
  const sp = specPath(slug);
  if (!fs.existsSync(sp)) return '<section class="panel"><h2>テストコード</h2><p class="muted">テストコードのファイルがまだありません。</p></section>';
  const src = fs.readFileSync(sp, 'utf8');
  const rel = path.relative(process.cwd(), sp).startsWith('..') ? sp : path.relative(process.cwd(), sp);
  const n = src.split('\n').length;
  return `<section class="panel" id="spec"><details><summary><strong>テストコード</strong>　<code>${esc(rel)}</code>　<span class="muted">${n} 行。押すと開く</span></summary>
<pre class="code">${src.split('\n').map((l, i) => `<span class="ln">${i + 1}</span>${esc(l)}`).join('\n')}</pre></details></section>`;
}

function gatePanel(st, slug, cur, questions, counts) {
  const status = st.stages[cur.key].status;
  const saved = st.stages[cur.key].answers || {};
  const v = viewOf(cur.key);
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
  const rd = readiness(st, slug, cur.key, questions);
  const ready = rd.ready;
  const nRef = questions.filter((q) => isReflected(q, saved)).length;
  const nAns = questions.filter((q) => saved[q.id]).length;
  const cov = (rd.covs || (rd.cov ? [rd.cov] : [])).map((c) => `<div class="ans-sum${ready ? ' ok' : ''}"><span>${esc(c.label)}</span><strong>${c.done}／${c.total} 件${c.extra ? `（${esc(c.extra)}）` : ''}</strong></div>`).join('');
  const lint = cur.key === 'code' && fs.existsSync(specPath(slug)) ? lintSpec(fs.readFileSync(specPath(slug), 'utf8')) : [];
  // フェイルしたケースの判断の進み具合。数と、まだのケースへのリンクは画面の中で更新する（CLIENT_JS）
  const failed = rd.failed || [];
  const judgeHtml = failed.length ? `<a class="ans-sum" id="judge-sum" href="#evidence"><span>フェイルしたケースの判断</span><strong data-judge-count>0／${failed.length} 件</strong></a><div class="judge-missing" id="judge-missing"></div>` : '';
  const lintHtml = lint.length ? `<div class="lint"><strong>決まりから外れた書き方（${lint.length} 種類）</strong><ul>${lint.map((l) => `<li>${esc(l.label)}${l.lines.length ? `（${l.lines.slice(0, 6).join('、')} 行目${l.lines.length > 6 ? ' ほか' : ''}）` : ''}</li>`).join('')}</ul></div>` : '';
  return `<form class="panel" id="decision" method="post" action="/api/${esc(slug)}/${esc(cur.key)}/decision"${failed.length ? ` data-judge-key="${esc(slug)}:${esc(rd.runId)}" data-judge-total="${failed.length}"` : ''}><input type="hidden" name="_token" value="${FORM_TOKEN}">
<div class="gate-title"><h2>${esc(cur.gate)}</h2>${badge(status)}<button type="button" class="btn btn-ghost drawer-close" data-drawer="close" style="padding:3px 10px;font-size:12px">閉じる</button></div>
<p class="muted" style="margin-top:0">${esc(v.lead)}</p>
${facts}
${cov}
${judgeHtml}
${lintHtml}
${questions.length ? `<a class="ans-sum${ready ? ' ok' : ''}" href="#answers"><span>仕様の食い違いへの回答</span><strong>${nAns}／${questions.length} 件回答・${nRef} 件反映</strong></a>` : ''}
<label class="field" for="note">指摘 <span class="hint">${esc(v.hint)}</span></label>
<textarea id="note" name="note" placeholder="${esc(v.placeholder)}"></textarea>
<div class="gate-actions"><div class="actions">
<button class="btn btn-return" name="action" value="return">差し戻す</button>
<button class="btn btn-confirm" name="action" value="confirm"${ready ? '' : ' data-blocked="1"'}${ready && !failed.length ? '' : ' disabled'}>確定する</button>
</div>
<p class="why-disabled" id="judge-why" hidden></p>
${ready ? '<p class="muted" style="margin:8px 0 0">確定すると次の段階へ進みます。確定と差し戻しは記録に残ります。</p>' : `<p class="why-disabled">${esc(rd.why)}</p>`}</div>
</form>`;
}

/** 観点一覧を全幅にしている間、関門の欄のかわりに画面の下に出す帯。 */
function focusBar(st, slug, cur, questions, counts) {
  const status = st.stages[cur.key].status;
  const saved = st.stages[cur.key].answers || {};
  const v = viewOf(cur.key);
  const rd = readiness(st, slug, cur.key, questions);
  const ready = rd.ready;
  const n = counts.find((c) => v.bar[0].test(c.label))?.n;
  const meta = [n !== undefined ? `${v.bar[1]} <strong>${n}</strong> 件` : '', ...(rd.covs || (rd.cov ? [rd.cov] : [])).map((c) => `${esc(c.label)} <strong>${c.done}／${c.total}</strong>`), questions.length ? `食い違いへの回答 <strong>${questions.filter((q) => saved[q.id]).length}／${questions.length}</strong>・反映 <strong>${questions.filter((q) => isReflected(q, saved)).length}</strong>` : '', status === 'ai_output' && (rd.failed || []).length ? `フェイルの判断 <strong data-judge-count>0／${rd.failed.length} 件</strong>` : ''].filter(Boolean).join('　');
  const buttons = status === 'ai_output'
    ? `<button type="button" class="btn btn-ghost" data-drawer="open">指摘を書く</button>
<button class="btn btn-return" form="decision" name="action" value="return">差し戻す</button>
<button class="btn btn-confirm" form="decision" name="action" value="confirm"${ready ? '' : ` data-blocked="1" title="${esc(rd.short)}"`}${ready && !(rd.failed || []).length ? '' : ' disabled'}>確定する</button>`
    : '<button type="button" class="btn btn-ghost" data-drawer="open">関門の欄を開く</button>';
  return `<div class="focus-bar" aria-label="関門の操作"><div class="focus-bar-in"><span class="fb-title">${esc(cur.gate)}</span>${badge(status)}<span class="fb-meta">${meta}</span>${status === 'ai_output' && !ready ? `<span class="fb-warn">${esc(rd.short)}</span>` : ''}<span class="fb-spacer"></span>${buttons}</div></div>`;
}

/** 確定した段階を見ているときに右の欄に出す、確定の記録（読み取り専用）。 */
function confirmedPanel(st, view) {
  const stage = st.stages[view.key];
  const returns = st.log.filter((l) => l.stage === view.key && l.action === 'return');
  const list = returns.length
    ? `<ol>${returns.map((l) => `<li><span class="t">${esc(formatTime(l.at))}</span><span class="note">${esc(l.note || '（理由なし）')}</span></li>`).join('')}</ol>`
    : '<p class="muted" style="margin:4px 0 0">差し戻しなしで確定しました。</p>';
  const confirmLog = st.log.filter((l) => l.stage === view.key && l.action === 'confirm').pop();
  const judged = Object.entries(confirmLog?.judgments || {});
  const judgedHtml = judged.length ? `<div class="evd-k">フェイルしたケースの判断（${judged.length} 件）</div><ul class="judged">${judged.map(([id, j]) => `<li><span class="q-id">${esc(id)}</span>${esc(JUDGE_KINDS.find((k) => k.key === j.kind)?.label || '')}<div class="note">${esc(j.basis || '')}</div></li>`).join('')}</ul>` : '';
  return `<section class="panel done-panel"><div class="gate-title"><h2>${esc(view.gate)}</h2>${badge('confirmed')}</div>
<p class="done-at">${esc(formatTime(stage.confirmed_at))} に確定</p>
${judgedHtml}
${changedAfterConfirm(st).some((x) => x.key === view.key) ? '<div class="stale">確定のあとで、この段階の成果物が書き換えられています。</div>' : ''}
<div class="evd-k">差し戻し（${returns.length} 回）</div>${list}
<p class="muted" style="margin-top:12px">確定した成果物は読み取り専用です。誤りを見つけたときは、今の段階の関門で差し戻し、指摘に「前の段階の誤り：ID」と、何が誤りかを書いて運営者に相談します。運営者が認めると、この段階を差し戻しに戻して直します。</p>
<p><a class="btn btn-ghost" href="/screen/${esc(st.slug)}">今の段階に戻る</a></p></section>`;
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
  const ACT = { init: '開始', ai_output: 'AI が出力', confirm: '確定', return: '差し戻し', reopen: '確定から差し戻しに戻す' };
  const WHO = { learner: '学習者', operator: '運営者' };
  return `<ul class="timeline">${st.log.slice().reverse().map((l) => {
    const stage = STAGES.find((s) => s.key === l.stage)?.label || '';
    return `<li class="tl by-${l.by === 'ai' ? 'ai' : 'learner'} act-${esc(l.action)}"><span class="tl-dot"></span><div>
<div class="tl-head"><span class="tl-act">${esc(ACT[l.action] || l.action)}</span><span class="muted">${esc(WHO[l.by] || 'AI')}${stage ? `・${esc(stage)}` : ''}</span><span class="tl-time">${esc(formatTime(l.at))}</span></div>
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
    // テストコードと実行の段階では、説明（code.md）のあとに、流した結果（実行の証拠）を続けて出す
    const run = view.key === 'code' ? readRun(slug) : null;
    const runHtml = view.key !== 'code' ? ''
      : run ? runSection(slug, run, { judge: cur?.key === 'code' && st.stages.code.status === 'ai_output' })
        : `<section class="panel" id="evidence"><h2>まだ流していません</h2><p class="muted">AI がテストを流すと、ケースごとの結果と証拠の画面がここに表示されます。</p></section>`;
    if (ap && fs.existsSync(ap)) {
      const md = fs.readFileSync(ap, 'utf8');
      if (view.key === 'perspectives') questions = parseDiscrepancies(md);
      counts = summaryCounts(md);
      const v = viewOf(view.key);
      const saved = st.stages[view.key].answers || {};
      const attn = questions.some((q) => !isReflected(q, saved)) ? '1' : '0';
      const cnt = (re) => counts.find((c) => re.test(c.label))?.n ?? '';
      artifactHtml = `<section class="panel">
<div class="doc-head"><div><h2 style="margin:0">${esc(view.label.replace(/^\d+\s*/, ''))}の成果物</h2><div class="doc-path">${esc(path.relative(process.cwd(), ap).startsWith('..') ? ap : path.relative(process.cwd(), ap))}</div><div class="muted" style="margin-top:2px">読み取り専用。直してほしい点は「${esc(view.gate)}」の指摘に書く</div></div>${v.wide.length ? '' : '<!-- '}<div class="doc-tools"><span class="muted layout-switch-label">表示の幅</span><div class="layout-switch" role="group" aria-label="表示の幅"><button type="button" data-layout="auto" title="${esc(v.wideLabel)}を読んでいる間は${esc(v.noun)}を全幅にする">自動</button><button type="button" data-layout="wide">常に全幅</button><button type="button" data-layout="split">常に2列</button></div></div>${v.wide.length ? '' : ' -->'}</div>
<nav class="toc" id="toc" data-attn="${attn}"${Object.entries(v.toc).map(([k, re]) => ` data-count-${k}="${cnt(re)}"`).join('')}></nav>
<div id="artifact" class="pending"><p class="loading">${esc(v.noun)}を表示しています…</p><pre>${esc(md)}</pre></div>
<textarea id="artifact-src" hidden>${esc(md)}</textarea></section>${view.key === 'code' ? specSection(slug) : ''}${runHtml}`;
      if (run) {
        const kinds = Object.values(run.cases).map(resultKind);
        counts = [{ label: 'パス', n: kinds.filter((k) => k === 'pass').length }, ...RESULT_KINDS.filter((k) => k.fail).map((k) => ({ label: `フェイル：${k.label}`, n: kinds.filter((x) => x === k.key).length })).filter((c) => c.n)];
      }
    } else if (ap) {
      artifactHtml = `<section class="panel"><h2>まだ成果物がありません</h2><p class="muted">AI が出力すると、ここに表示されます。AI への頼み方は、上の「次にやること」にあります。</p></section>`;
    } else {
      artifactHtml = `<section class="panel"><h2>${esc(view.label.replace(/^\d+\s*/, ''))}の成果物</h2><p>この段階の成果物の形と置き場所は、まだ決まっていません。手順は <code>${esc(view.guide)}</code> を参照してください。</p>
${(() => { const done = STAGES.filter((x) => x.artifact && x.key !== view.key && st.stages[x.key].status === 'confirmed'); return done.length ? `<p style="display:flex;gap:8px;flex-wrap:wrap">${done.map((x) => `<a class="btn btn-ghost" href="/screen/${esc(slug)}?stage=${esc(x.key)}">確定した${esc(x.label.replace(/^\d+\s*/, ''))}を見る</a>`).join('')}</p>` : ''; })()}</section>`;
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
  const bar = showGate && artifactHtml.includes('id="artifact"') ? focusBar(st, slug, cur, questions, counts) : '';
  // 確定した段階を見ているときは、関門の欄の代わりに確定の記録を出す
  const done = !showGate && view && st.stages[view.key]?.status === 'confirmed' ? confirmedPanel(st, view) : '';
  const viewingOther = view && cur && view.key !== cur.key;
  const body = `<h1>${esc(name || st.screen)}</h1>
${name ? `<p class="subtitle"><code>${esc(st.screen)}</code></p>` : "<p class=\"subtitle\">観点一覧ができると、画面名が表示されます。</p>"}
<div class="panel status">${stepper(st, { viewing: view?.key, linkSlug: slug })}${nextBox}</div>
${(() => { const ch = changedAfterConfirm(st); return ch.length ? `<div class="stale">確定した${ch.map((x) => `「${esc(x.label)}」`).join('、')}の成果物が、確定のあとで書き換えられています。学習者が確定した内容と違うまま先へ進んでいます。書き換えた理由を確かめ、必要ならその段階からやり直してください。</div>` : ''; })()}
${viewingOther ? `<p class="muted">確定済みの「${esc(view.label)}」を表示しています。<a href="/screen/${esc(slug)}">今の段階に戻る</a></p>` : ''}
<div class="layout" id="layout" data-wide="${esc(viewOf(view?.key).wide.join(','))}"><div>${answers}${artifactHtml}</div>
<aside class="aside">${gate}${done}</aside></div>
<section class="panel"><h2>記録</h2>${timeline(st)}</section>
${showGate && st.stages[cur.key].status === 'ai_output' ? '<a class="btn jump" href="#decision">判断の入力へ ↓</a>' : ''}
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js" integrity="sha384-/TQbtLCAerC3jgaim+N78RZSDYV7ryeoBCVqTuzRrFec2akfBkHS7ACQ3PQhvMVi" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" integrity="sha384-qJNkHwhlYywDHfyoEe1np+1lYvX/8x+3gHCKFhSSBMQyCFlvFnn+zXmaebXl21rV" crossorigin="anonymous"></script>
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
    if (m && !SLUG_RE.test(m[1])) m = null;
    if (req.method === 'GET' && m) {
      const html = screenPage(m[1], url.searchParams.get('stage'));
      return html ? send(res, 200, html) : send(res, 404, messagePage('見つかりません', '<p>その画面の状態ファイルがありません。</p>'));
    }
    m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/([a-z]+)\/decision$/);
    if (m && !SLUG_RE.test(m[1])) m = null;
    if (req.method === 'POST' && m) {
      const form = new URLSearchParams(await readBody(req));
      // ほかのサイトや別のプロセスからの送信を受け付けない。確定は、学習者がこの画面で押したときだけにする
      const site = req.headers['sec-fetch-site'];
      if (form.get('_token') !== FORM_TOKEN || (site && site !== 'same-origin')) {
        return send(res, 403, messagePage('操作できません', '<p>この画面のフォームからの送信ではないため、受け付けませんでした。画面を読み込み直してから、もう一度操作してください。</p>', m[1]));
      }
      try {
        const answers = Object.fromEntries([...form.entries()].filter(([k]) => k.startsWith('answer:')).map(([k, v]) => [k.slice(7), v]));
        const judgments = {};
        for (const [k, v] of form.entries()) {
          const mm = k.match(/^(judge|basis):(.+)$/);
          if (mm) (judgments[mm[2]] ||= {})[mm[1] === 'judge' ? 'kind' : 'basis'] = v;
        }
        recordDecision(m[1], m[2], form.get('action') || '', form.get('note') || '', answers, judgments);
      } catch (e) {
        return send(res, 400, messagePage('操作できません', `<p>${esc(e.message)}</p>`, m[1]));
      }
      res.writeHead(303, { Location: `/screen/${m[1]}` });
      return res.end();
    }
    m = url.pathname.match(/^\/evidence\/([a-z0-9-]+)\/([^/]+)$/);
    if (m && !SLUG_RE.test(m[1])) m = null;
    if (req.method === 'GET' && m) {
      let name = '';
      try { name = decodeURIComponent(m[2]); } catch { return send(res, 404, 'not found', 'text/plain'); }
      if (!/^[A-Za-z0-9-]+-\d+\.png$/.test(name)) return send(res, 404, 'not found', 'text/plain');
      const file = path.join(evidenceDir(m[1]), name);
      if (!fs.existsSync(file)) return send(res, 404, 'not found', 'text/plain');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method === 'GET' && url.pathname === '/api/states') return send(res, 200, JSON.stringify(listStates()), 'application/json; charset=utf-8');
    return send(res, 404, messagePage('見つかりません', '<p>ページがありません。</p>'));
  } catch (e) {
    // 詳しい内容はサーバーの出力にだけ出し、画面には出さない
    console.error(e);
    return send(res, 500, messagePage('エラー', '<p>画面を表示できませんでした。ダッシュボードを起動した端末の出力を確かめてください。</p>'));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`結合テストのワークフロー: http://localhost:${PORT}（対象: ${baseDir()}）`);
  console.log('VS Code の「ポート」タブで転送し、手元のブラウザで開いてください。');
});

// PR で変更されたドキュメントを、プレビューサイト上の該当ページへの直リンク付きで
// Markdown の表にして標準出力へ書き出す（docs-preview.yml から実行）。
// 変更が見出しの配下にある場合は、見出しアンカー付きの直リンクも列挙する。
//
// 「どのページを直せばいいか PR 説明から探す」手間をなくすのが目的（ADR-031 追記）。
// プレビュー URL は PR 番号だけで決まるため、ラベル付与後に URL が分かる必要はない。
//
// 見出しアンカーは、明示 ID（`## 見出し {#id}`）があればそれを、無ければ github-slugger で
// 算出する。Docusaurus 自身が同じライブラリで ID を生成するため結果は一致する
// （docs-next/docs 配下の全見出しでビルド済み HTML の ID と一致することを確認済み）。
//
// 前提: 同一ジョブで build-docs-site が実行済みで、
//   - docs-next/.docusaurus/globalData.json（Docusaurus のルート情報。baseUrl 適用済み）
//   - pages-root/（合成済みの配信物。URL の実在確認に使う）
// がワークスペースに存在すること。
//
// 環境変数:
//   GITHUB_REPOSITORY  owner/repo
//   GITHUB_TOKEN       PR files API 用
//   PR_NUMBER          PR 番号
//   PREVIEW_BASE       プレビューのベース URL（末尾スラッシュあり）

import fs from 'node:fs';
import path from 'node:path';

/**
 * Docusaurus が見出し ID の生成に使っているものと同じ slugger。
 * このスクリプトはリポジトリルートから実行するため通常の解決では見つからない。
 * ビルド済みの docs-next/node_modules を明示的に指す（読めない場合は見出し列挙を諦める）。
 */
async function loadSlugger() {
  try {
    const mod = await import(new URL('../../docs-next/node_modules/github-slugger/index.js', import.meta.url));
    return mod.default ?? mod;
  } catch {
    return null;
  }
}
const Slugger = await loadSlugger();

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const prNumber = process.env.PR_NUMBER;
const previewBase = (process.env.PREVIEW_BASE ?? '').replace(/\/?$/, '/');

const MAX_ROWS = 30;
const MAX_HEADINGS_PER_PAGE = 5;
// 見出しリンクは 1 本あたり最大 400 バイト程度になる。GitHub のコメント上限（65,536 文字）に
// 収めるため、コメント全体でのリンク本数にも上限を設ける。
const MAX_HEADING_LINKS_TOTAL = 60;
const DOCUSAURUS_DOCS_DIR = 'docs-next/docs/';
const OPS_NOTE_DIR = 'ops-note/';
const PAGES_ROOT = 'pages-root';

/** PR の変更ファイル一覧を GitHub API から取得する（git diff はマージコミット差分になるため使わない）。 */
async function fetchChangedFiles() {
  const files = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) throw new Error(`PR files API failed: ${res.status} ${await res.text()}`);
    const chunk = await res.json();
    files.push(...chunk);
    if (chunk.length < 100) break;
  }
  return files.map((f) => ({ filename: f.filename, status: f.status, patch: f.patch }));
}

/**
 * Docusaurus のルート情報（doc id -> URL パス）。
 * id はドキュメントルートからの相対パスから拡張子を落としたものと一致する。
 * slug や index.md のディレクトリ URL 化も含めて Docusaurus 側の解決結果をそのまま使えるため、
 * パス文字列を自前で変換するより堅い。
 */
function loadDocusaurusRoutes() {
  const file = 'docs-next/.docusaurus/globalData.json';
  if (!fs.existsSync(file)) return new Map();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const versions = data['docusaurus-plugin-content-docs']?.default?.versions ?? [];
  const map = new Map();
  for (const version of versions) {
    for (const doc of version.docs ?? []) map.set(doc.id, doc.path);
  }
  return map;
}

/** pages-root 配下に実体があるときだけ URL を返す（変換規則のズレでリンク切れを出さないため）。 */
function resolveIfBuilt(relativeUrlPath) {
  const candidates = relativeUrlPath.endsWith('/')
    ? [path.join(PAGES_ROOT, relativeUrlPath, 'index.html')]
    : [path.join(PAGES_ROOT, relativeUrlPath)];
  return candidates.some((c) => fs.existsSync(c)) ? previewBase + relativeUrlPath : null;
}

function previewUrlFor(filename, routes, siteOrigin) {
  if (filename.startsWith(DOCUSAURUS_DOCS_DIR) && /\.mdx?$/.test(filename)) {
    const id = filename.slice(DOCUSAURUS_DOCS_DIR.length).replace(/\.mdx?$/, '');
    const routePath = routes.get(id);
    // globalData の path は DOCS_BASE_URL 適用済み（＝プレビューのパス）なのでそのまま使える
    return routePath ? siteOrigin + routePath : null;
  }
  if (filename.startsWith(OPS_NOTE_DIR)) {
    return resolveIfBuilt(filename);
  }
  return null;
}

/** 見出しは frontmatter の title、無ければ最初の H1、それも無ければパス。 */
function titleFor(filename) {
  if (!fs.existsSync(filename)) return filename;
  const text = fs.readFileSync(filename, 'utf8');
  if (filename.endsWith('.html')) {
    const t = text.match(/<title>([\s\S]*?)<\/title>/i);
    return t ? t[1].trim() : filename;
  }
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const title = fm[1].match(/^title:\s*(.+)$/m);
    if (title) return title[1].trim().replace(/^['"]|['"]$/g, '');
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : filename;
}

/** 見出しラベルからインライン記法（コードスパン・強調・リンク）を落とす。Docusaurus の ID 生成に合わせる。 */
function stripInlineMarkdown(text) {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
    .trim();
}

/**
 * Markdown 本文から見出し（H2 以下）を行番号付きで取り出す。
 * frontmatter とコードフェンスの内側は除外する（シェルのコメント行を見出しと誤認しないため）。
 */
function parseHeadings(text) {
  if (!Slugger) return [];
  const lines = text.split(/\r?\n/);
  const slugger = new Slugger();
  const headings = [];
  let i = 0;
  if (lines[0]?.trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++;
  }
  let inFence = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    let raw = m[2];
    const explicit = raw.match(/\{#([^}\s]+)\}\s*$/);
    if (explicit) raw = raw.slice(0, explicit.index).trim();
    const label = stripInlineMarkdown(raw);
    // 明示 ID の見出しでも slugger を進めて、自動生成側の重複採番を Docusaurus と揃える
    const generated = slugger.slug(label);
    if (m[1].length === 1) continue;
    headings.push({ line: i + 1, label, id: explicit ? explicit[1] : generated });
  }
  return headings;
}

/**
 * unified diff から head 側の変更行番号を取り出す。
 * 追加行はその行、削除行は削除位置に来る head 側の行に寄せる（見出しへの割り当てにはこれで足りる）。
 */
function changedHeadLines(patch) {
  const lines = [];
  let head = 0;
  for (const line of patch.split('\n')) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      head = Number(hunk[1]);
      continue;
    }
    if (head === 0) continue;
    if (line.startsWith('+')) lines.push(head++);
    else if (line.startsWith('-')) lines.push(Math.max(head, 1));
    else if (line.startsWith(' ')) head++;
  }
  return lines;
}

/** 変更行を、直前の見出しへ割り当てる（どの見出しにも属さない変更は無視する）。 */
function changedHeadings(filename, patch) {
  if (!patch || !fs.existsSync(filename)) return [];
  const headings = parseHeadings(fs.readFileSync(filename, 'utf8'));
  if (headings.length === 0) return [];
  const hit = new Set();
  for (const line of changedHeadLines(patch)) {
    let found = null;
    for (const h of headings) {
      if (h.line <= line) found = h;
      else break;
    }
    if (found) hit.add(found.id);
  }
  return headings.filter((h) => hit.has(h.id));
}

/**
 * ビルド済み HTML に当該 ID が実在するときだけアンカーを採用する。
 * HTML を特定できない場合は算出結果を信頼する（ID の算出規則は検証済み）。
 */
function anchorExists(routePath, id) {
  const basePath = new URL(previewBase).pathname;
  const relative = routePath.startsWith(basePath) ? routePath.slice(basePath.length) : routePath.replace(/^\//, '');
  const file = path.join(PAGES_ROOT, relative, 'index.html');
  if (!fs.existsSync(file)) return true;
  const html = fs.readFileSync(file, 'utf8');
  return new RegExp(`id=("?)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1[\\s>]`).test(html);
}

const STATUS_LABEL = {
  added: '追加',
  modified: '変更',
  renamed: '移動',
  removed: '削除',
  copied: '追加',
  changed: '変更',
};

function isDocFile(filename) {
  return (
    (filename.startsWith(DOCUSAURUS_DOCS_DIR) && /\.mdx?$/.test(filename)) ||
    (filename.startsWith(OPS_NOTE_DIR) && filename.endsWith('.html'))
  );
}

const files = (await fetchChangedFiles()).filter((f) => isDocFile(f.filename));
const routes = loadDocusaurusRoutes();
const owner = repo.split('/')[0].toLowerCase();
const siteOrigin = `https://${owner}.github.io`;

/** 表のセル内で表を壊す文字を無効化する。 */
function escapeCell(text) {
  return text.replace(/\|/g, '\\|');
}

let headingLinkBudget = MAX_HEADING_LINKS_TOTAL;

/** 3 列目のセル。見出しに割り当てられない変更は「ページ全体」または「—」にする。 */
function headingCell(f, url, routes) {
  if (!url) return '—';
  // 新規追加・移動は全行が差分になるため、見出しを列挙しても情報にならない
  if (f.status !== 'modified' && f.status !== 'changed') return 'ページ全体';
  // 差分が大きいファイルでは API が patch を返さない
  if (!f.patch) return '判定不可';
  if (!f.filename.startsWith(DOCUSAURUS_DOCS_DIR)) return '—';
  const id = f.filename.slice(DOCUSAURUS_DOCS_DIR.length).replace(/\.mdx?$/, '');
  const routePath = routes.get(id);
  if (!routePath) return '—';
  const headings = changedHeadings(f.filename, f.patch);
  if (headings.length === 0) return '—';
  const shown = Math.min(headings.length, MAX_HEADINGS_PER_PAGE, headingLinkBudget);
  headingLinkBudget -= shown;
  const links = headings.slice(0, shown).map((h) => {
    const label = escapeCell(h.label);
    return anchorExists(routePath, h.id) ? `[${label}](${url}#${encodeURIComponent(h.id)})` : label;
  });
  if (headings.length > shown) links.push(`ほか ${headings.length - shown} 件`);
  return links.join('<br />');
}

const rows = files.map((f) => {
  const url = f.status === 'removed' ? null : previewUrlFor(f.filename, routes, siteOrigin);
  const label = url ? `[${escapeCell(titleFor(f.filename))}](${url})` : `\`${f.filename}\``;
  return `| ${label} | ${STATUS_LABEL[f.status] ?? f.status} | ${headingCell(f, url, routes)} |`;
});

const out = ['## 📄 このPRで変更されたドキュメント', ''];
if (rows.length === 0) {
  out.push('この PR ではドキュメントの変更はありません。');
} else {
  out.push(
    `プレビュー: ${previewBase}`,
    '',
    '| ページ | 変更 | 変更された見出し |',
    '| --- | --- | --- |',
  );
  out.push(...rows.slice(0, MAX_ROWS));
  if (rows.length > MAX_ROWS) out.push('', `ほか ${rows.length - MAX_ROWS} 件は「Files changed」を参照。`);
  out.push(
    '',
    '<sub>削除されたページと、サイトに含まれないファイルはリンクなしで表示します。frontmatter や見出しの外側だけの変更、および運営ノート（素の HTML）は見出しを「—」で示します。</sub>',
  );
}
process.stdout.write(out.join('\n') + '\n');

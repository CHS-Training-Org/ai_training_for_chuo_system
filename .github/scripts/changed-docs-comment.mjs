// PR で変更されたドキュメントを、プレビューサイト上の該当ページへの直リンク付きで
// Markdown の表にして標準出力へ書き出す（docs-preview.yml から実行）。
//
// 「どのページを直せばいいか PR 説明から探す」手間をなくすのが目的（ADR-031 追記）。
// プレビュー URL は PR 番号だけで決まるため、ラベル付与後に URL が分かる必要はない。
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

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const prNumber = process.env.PR_NUMBER;
const previewBase = (process.env.PREVIEW_BASE ?? '').replace(/\/?$/, '/');

const MAX_ROWS = 30;
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
  return files.map((f) => ({ filename: f.filename, status: f.status }));
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

const rows = files.map((f) => {
  const url = f.status === 'removed' ? null : previewUrlFor(f.filename, routes, siteOrigin);
  const label = url ? `[${titleFor(f.filename)}](${url})` : `\`${f.filename}\``;
  return `| ${label} | ${STATUS_LABEL[f.status] ?? f.status} |`;
});

const out = ['## 📄 このPRで変更されたドキュメント', ''];
if (rows.length === 0) {
  out.push('この PR ではドキュメントの変更はありません。');
} else {
  out.push(`プレビュー: ${previewBase}`, '', '| ページ | 変更 |', '| --- | --- |');
  out.push(...rows.slice(0, MAX_ROWS));
  if (rows.length > MAX_ROWS) out.push('', `ほか ${rows.length - MAX_ROWS} 件は「Files changed」を参照。`);
  out.push('', '<sub>削除されたページと、サイトに含まれないファイルはリンクなしで表示します。</sub>');
}
process.stdout.write(out.join('\n') + '\n');

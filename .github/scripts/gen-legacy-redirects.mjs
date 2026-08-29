// 旧ドキュメントサイト（Zensical 版・docs-next サブパス版）の URL から、
// 一本化後の URL へ飛ばすリダイレクトスタブを pages-root 配下に生成する。
//
// 一本化（Issue #93）で 2 種類の URL が失われる。
//   1. 旧 Zensical 版のページ URL（`/guide/dev-workflow/` など）
//      → Docusaurus の再編で `/develop/dev-workflow/` のようにパスが変わった
//   2. 並行運用期間の docs-next の URL（`/docs-next/learn/curriculum/` など）
//      → baseUrl をルートへ移したことで `/learn/curriculum/` になった
// どちらも Teams・OneNote・運営ノートで共有済みのため、404 にせず飛ばす。
//
// GitHub Pages のブランチ配信では `_redirects` 等のサーバ側リダイレクトが使えないので、
// meta refresh + canonical の静的 HTML を置く。
//
// 前提: 同一ジョブで docs-next のビルド成果物が pages-root/ に展開済みであること。
// 既存ページは絶対に上書きしない（上書きは本物のページを潰すため、検知したら失敗させる）。

import fs from 'node:fs';
import path from 'node:path';

const PAGES_ROOT = 'pages-root';
// リダイレクト先の絶対パス。PR プレビューは本番と別パスで配信されるため、
// Docusaurus に渡した baseUrl と同じ値を使う（未設定なら本番のパス）。
const SITE_BASE = (process.env.DOCS_BASE_URL || '/ai_training_for_chuo_system/').replace(/\/?$/, '/');

/**
 * 旧 Zensical URL -> 新 URL。キー・値ともサイトルートからの相対パス（末尾スラッシュあり）。
 * 空文字はトップページ。
 *
 * 旧サイトは docs_dir（`Docs/`）配下の全 Markdown を公開していたため、
 * ナビゲーションに載っていなかったページも URL を持っていた。ここは
 * `Docs/**\/*.md` の全件から起こしている。
 *
 * 新サイトに 1:1 の行き先がないもの（`Docs/` の索引ページ、AI-DLC の作業成果物、
 * リポジトリ内部向けの文章規範）はトップページへ送る。
 */
const ZENSICAL_MAP = {
  // 学習者向けガイド
  'guide/': '',
  'guide/glossary/': 'learn/glossary/',
  'guide/curriculum/': 'learn/curriculum/',
  'guide/getting-started/': 'learn/getting-started/',
  'guide/ai-tools-guide/': 'learn/ai-tools-guide/',
  'guide/claude-code-best-practices/': 'learn/claude-code-best-practices/',
  'guide/dev-workflow/': 'develop/dev-workflow/',
  'guide/coding-conventions/': 'develop/coding-conventions/',
  'guide/enhancement-catalog/': 'develop/enhancement-catalog/',
  'guide/review-criteria/': 'develop/review-criteria/',
  'guide/troubleshooting/': 'develop/troubleshooting/',
  'guide/operations-guide/': 'operations/operations-guide/',
  'guide/issue-registration/': 'operations/issue-registration/',
  'guide/learning-effectiveness/': 'operations/learning-effectiveness/',

  // リファレンス
  'ARCHITECTURE/': 'reference/architecture/',
  'design/': 'reference/design/',
  'claude/': 'reference/claude-code/',
  'claude/agent-config/': 'reference/claude-code/agent-config/',
  'spec/aidlc-adoption/': 'reference/aidlc/adoption/',

  // ADR
  'decision/README/': 'reference/adr/',

  // エンハンス要件シート（難易度別ディレクトリへ再編）
  'spec/enhancements/resource-list-filter/': 'spec/enhancements/beginner/resource-list-filter/',
  'spec/enhancements/resource-list-sort/': 'spec/enhancements/beginner/resource-list-sort/',
  'spec/enhancements/reservation-list-filter/': 'spec/enhancements/beginner/reservation-list-filter/',
  'spec/enhancements/resource-detail-info/': 'spec/enhancements/beginner/resource-detail-info/',
  'spec/enhancements/e2e-test-coverage/': 'spec/enhancements/beginner/e2e-test-coverage/',
  'spec/enhancements/recurring-reservation/': 'spec/enhancements/intermediate/recurring-reservation/',
  'spec/enhancements/calendar-view/': 'spec/enhancements/intermediate/calendar-view/',
  'spec/enhancements/usage-statistics/': 'spec/enhancements/intermediate/usage-statistics/',
  'spec/enhancements/csv-export/': 'spec/enhancements/intermediate/csv-export/',
  'spec/enhancements/reservation-draft/': 'spec/enhancements/intermediate/reservation-draft/',
  'spec/enhancements/multi-step-approval/': 'spec/enhancements/advanced/multi-step-approval/',
  'spec/enhancements/department-approver/': 'spec/enhancements/advanced/department-approver/',
  'spec/enhancements/resource-image-upload/': 'spec/enhancements/advanced/resource-image-upload/',
  'spec/enhancements/audit-log/': 'spec/enhancements/advanced/audit-log/',
  'spec/enhancements/openapi-client-gen/': 'spec/enhancements/advanced/openapi-client-gen/',

  // 新サイトに対応ページを持たないもの（トップページへ）
  'CLAUDE/': '',
  'spec/aidlc-state/': '',
  'spec/aidlc-audit/': '',
};

/** ADR は 001〜028 が同じ規則で移った。ファイル名がそのまま残っているので機械的に起こす。 */
const ADR_SLUGS = [
  'ADR-001-frontend-package-manager',
  'ADR-002-frontend-styling',
  'ADR-003-frontend-ui-components',
  'ADR-004-frontend-data-fetching',
  'ADR-005-frontend-form-library',
  'ADR-006-frontend-validation',
  'ADR-007-frontend-client-state',
  'ADR-008-frontend-auth-client',
  'ADR-009-frontend-test-strategy',
  'ADR-010-frontend-lint-format',
  'ADR-011-backend-build-tool',
  'ADR-012-backend-orm',
  'ADR-013-backend-db-migration',
  'ADR-014-backend-validation',
  'ADR-015-backend-api-docs',
  'ADR-016-backend-auth',
  'ADR-017-backend-logging',
  'ADR-018-backend-test-strategy',
  'ADR-019-backend-code-quality',
  'ADR-020-aidlc-engine-adoption',
  'ADR-021-okf-frontmatter-adoption',
  'ADR-022-wsl-container-future-adoption',
  'ADR-023-mentor-gate-removal',
  'ADR-024-ai-first-review-adoption',
  'ADR-025-ai-review-completion-gate',
  'ADR-026-comprehension-check-quiz-format',
  'ADR-027-docusaurus-migration',
  'ADR-028-training-purpose',
];
for (const slug of ADR_SLUGS) {
  ZENSICAL_MAP[`decision/${slug}/`] = `reference/adr/${slug}/`;
}

/** AI-DLC の作業成果物はサイトの読み物ではないため、まとめてトップページへ送る。 */
const AIDLC_DOCS_PREFIX = 'spec/aidlc-docs/';

function stubHtml(targetUrl) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>移動しました</title>
<link rel="canonical" href="${targetUrl}">
<meta http-equiv="refresh" content="0; url=${targetUrl}">
<meta name="robots" content="noindex">
</head>
<body>
<p>このページは <a href="${targetUrl}">${targetUrl}</a> へ移動しました。</p>
</body>
</html>
`;
}

let written = 0;
const skipped = [];

/** 既存ページがある場所には書かない。旧 URL と新 URL が一致するページを潰さないため。 */
function writeStub(fromPath, toPath) {
  const dir = path.join(PAGES_ROOT, fromPath);
  const file = path.join(dir, 'index.html');
  if (fs.existsSync(file)) {
    skipped.push(fromPath);
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, stubHtml(SITE_BASE + toPath));
  written++;
}

if (!fs.existsSync(PAGES_ROOT)) {
  console.error(`${PAGES_ROOT}/ がありません。docs-next のビルド成果物を展開してから実行してください。`);
  process.exit(1);
}

// 並行運用期間の docs-next のルート一覧を、スタブを書き始める前に確定させる。
// pages-root から拾うと、この後に置く Zensical 由来のスタブや ops-note まで
// ルートとして数えてしまうため、Docusaurus のビルド成果物を直接見る。
const DOCUSAURUS_BUILD = 'docs-next/build';
if (!fs.existsSync(DOCUSAURUS_BUILD)) {
  console.error(`${DOCUSAURUS_BUILD}/ がありません。docs-next をビルドしてから実行してください。`);
  process.exit(1);
}
const docsNextRoutes = [''];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = path.join(dir, entry.name);
    if (fs.existsSync(path.join(p, 'index.html'))) {
      docsNextRoutes.push(path.relative(DOCUSAURUS_BUILD, p).replace(/\\/g, '/') + '/');
    }
    collect(p);
  }
};
collect(DOCUSAURUS_BUILD);

// 1. 旧 Zensical URL
for (const [from, to] of Object.entries(ZENSICAL_MAP)) {
  writeStub(from, to);
}

// 2. 旧 Zensical の AI-DLC 作業成果物（`Docs/spec/aidlc-docs/**`）
//    リポジトリに実ファイルが残っているので、そこから URL を起こす。
const aidlcDocsRoot = 'Docs/spec/aidlc-docs';
if (fs.existsSync(aidlcDocsRoot)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.md')) {
        const rel = path.relative(aidlcDocsRoot, p).replace(/\.md$/, '').replace(/\\/g, '/');
        const urlPath = rel === 'index' ? AIDLC_DOCS_PREFIX : `${AIDLC_DOCS_PREFIX}${rel}/`;
        writeStub(urlPath, '');
      }
    }
  };
  walk(aidlcDocsRoot);
}

// 3. 並行運用期間の docs-next URL（`/docs-next/<route>/` -> `/<route>/`）
for (const route of docsNextRoutes) {
  writeStub(`docs-next/${route}`, route);
}

console.log(`リダイレクトスタブを ${written} 件生成しました。`);
if (skipped.length > 0) {
  console.error('既存ページと衝突したため生成をスキップした URL があります:');
  for (const s of skipped) console.error(`  /${s}`);
  console.error('旧 URL と新 URL のパスが同じ場合は ZENSICAL_MAP から外してください。');
  process.exit(1);
}

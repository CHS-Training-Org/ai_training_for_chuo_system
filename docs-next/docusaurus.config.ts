import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'BookFlow ドキュメント',
  tagline: '社内 AI 駆動開発チュートリアル「BookFlow」の設計・学習ドキュメント',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://CHS-Training-Org.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  // PR プレビュー（docs-preview.yml）は本番と別パスで配信されるため、
  // ワークフローから DOCS_BASE_URL で差し替えられるようにしている。
  // 未設定・空文字のときは本番のパスを使う（`??` だと空文字が通ってしまうので `||`）。
  // 一本化（Issue #93）でサイトのルートへ移した。旧 `/docs-next/` 配下の URL は
  // .github/scripts/gen-legacy-redirects.mjs が生成するスタブで救う。
  baseUrl: process.env.DOCS_BASE_URL || '/ai_training_for_chuo_system/',

  // GitHub pages deployment config.
  organizationName: 'CHS-Training-Org', // Usually your GitHub org/user name.
  projectName: 'ai_training_for_chuo_system', // Usually your repo name.

  // 破損リンク・破損アンカーはビルドを失敗させる。
  // 'warn' のままだと壊れたまま公開でき、Zensical からの移行時に 100 件超の破損が
  // 気づかれず残っていた。壊した本人のビルドで止めるのがいちばん安い。
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/CHS-Training-Org/ai_training_for_chuo_system/tree/main/docs-next/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // .md は CommonMark、.mdx のみ MDX として解釈する。
  // 既定の 'mdx' では見出しの明示 ID（`{#id}`）と生 HTML が MDX 式・JSX として解析され、
  // 移行時に `\{#id}` へエスケープせざるを得なくなっていた（アンカーが全滅する原因）。
  markdown: {
    format: 'detect',
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      'docusaurus-plugin-search-local',
      {
        indexBlog: false,
        indexPages: true,
        hashed: true,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'BookFlow Docs',
      logo: {
        alt: 'BookFlow Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'learnSidebar',
          position: 'left',
          label: '学習',
        },
        {
          type: 'docSidebar',
          sidebarId: 'developSidebar',
          position: 'left',
          label: '開発ガイド',
        },
        {
          type: 'docSidebar',
          sidebarId: 'specSidebar',
          position: 'left',
          label: '仕様',
        },
        {
          type: 'docSidebar',
          sidebarId: 'referenceSidebar',
          position: 'left',
          label: 'リファレンス',
        },
        {
          type: 'docSidebar',
          sidebarId: 'operationsSidebar',
          position: 'left',
          label: '運用',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          href: 'https://github.com/CHS-Training-Org/ai_training_for_chuo_system',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '学習',
          items: [
            {
              label: 'カリキュラム',
              to: '/learn/curriculum',
            },
            {
              label: '環境構築',
              to: '/learn/getting-started',
            },
            {
              label: 'AI ツール活用',
              to: '/learn/ai-tools-guide',
            },
          ],
        },
        {
          title: '仕様',
          items: [
            {
              label: '要件定義',
              to: '/spec/requirements',
            },
            {
              label: 'API 仕様',
              to: '/spec/api-spec',
            },
            {
              label: '画面仕様',
              to: '/spec/screen-spec',
            },
            {
              label: 'ER 図',
              to: '/spec/er-diagram',
            },
          ],
        },
        {
          title: 'リファレンス',
          items: [
            {
              label: 'アーキテクチャ',
              to: '/reference/architecture',
            },
            {
              label: 'ADR 一覧',
              to: '/reference/adr',
            },
          ],
        },
        {
          title: 'コミュニティ',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/CHS-Training-Org/ai_training_for_chuo_system',
            },
            {
              label: 'Issue 起票',
              href: 'https://github.com/CHS-Training-Org/ai_training_for_chuo_system/issues/new/choose',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 中央システム. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
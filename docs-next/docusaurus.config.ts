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
  baseUrl: '/ai_training_for_chuo_system/docs-next/',

  // GitHub pages deployment config.
  organizationName: 'CHS-Training-Org', // Usually your GitHub org/user name.
  projectName: 'ai_training_for_chuo_system', // Usually your repo name.

  onBrokenLinks: 'warn',

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
          exclude: ['design.md'],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

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
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    // docs-next 並行運用期間限定の案内バナー（ADR-027 Phase 5 で撤去）
    announcementBar: {
      id: 'docs-next-preview-notice',
      content:
        '📣 現在プレビュー中の新デザインです。従来のドキュメントサイトは <a href="/ai_training_for_chuo_system/">こちら</a>。ご意見は <a href="https://github.com/CHS-Training-Org/ai_training_for_chuo_system/issues/new/choose">Issue</a> へどうぞ。',
      backgroundColor: '#fff5cc',
      textColor: '#333',
      isCloseable: true,
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
          sidebarId: 'curriculumSidebar',
          position: 'left',
          label: 'カリキュラム',
        },
        {
          type: 'docSidebar',
          sidebarId: 'specSidebar',
          position: 'left',
          label: '本編・仕様',
        },
        {
          type: 'docSidebar',
          sidebarId: 'referenceSidebar',
          position: 'left',
          label: '辞典/リファレンス',
        },
        {
          type: 'docSidebar',
          sidebarId: 'developSidebar',
          position: 'left',
          label: '開発ガイド',
        },
        {
          type: 'docSidebar',
          sidebarId: 'operationsSidebar',
          position: 'left',
          label: '運用・管理',
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
              to: '/curriculum',
            },
            {
              label: '環境構築',
              to: '/getting-started',
            },
            {
              label: 'AI ツール活用',
              to: '/ai-tools-guide',
            },
          ],
        },
        {
          title: '仕様',
          items: [
            {
              label: '要件定義',
              to: '/requirements',
            },
            {
              label: 'API 仕様',
              to: '/api-spec',
            },
            {
              label: '画面仕様',
              to: '/screen-spec',
            },
            {
              label: 'ER 図',
              to: '/er-diagram',
            },
          ],
        },
        {
          title: 'リファレンス',
          items: [
            {
              label: 'アーキテクチャ',
              to: '/architecture',
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
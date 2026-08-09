import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import HomepageHero from '@site/src/components/HomepageHero';
import HomepageCurriculum from '@site/src/components/HomepageCurriculum';
import TechStackGrid from '@site/src/components/TechStackGrid';
import clsx from 'clsx';
import styles from './index.module.css';

const techStack = {
  'フロントエンド': [
    { name: 'TypeScript', logo: '/assets/logos/typescript.svg', alt: 'TypeScript' },
    { name: 'Next.js 15', logo: '/assets/logos/nextdotjs.svg', alt: 'Next.js' },
    { name: 'React 19', logo: '/assets/logos/react.svg', alt: 'React' },
    { name: 'Tailwind CSS', logo: '/assets/logos/tailwindcss.svg', alt: 'Tailwind CSS' },
    { name: 'shadcn/ui', logo: '/assets/logos/shadcnui.svg', alt: 'shadcn/ui' },
    { name: 'Better Auth', logo: '/assets/logos/betterauth.svg', alt: 'Better Auth' },
  ],
  'バックエンド': [
    { name: 'Java 25', logo: '/assets/logos/openjdk.svg', alt: 'Java' },
    { name: 'Spring Boot', logo: '/assets/logos/spring.svg', alt: 'Spring Boot' },
    { name: 'Gradle', logo: '/assets/logos/gradle.svg', alt: 'Gradle' },
    { name: 'PostgreSQL', logo: '/assets/logos/postgresql.svg', alt: 'PostgreSQL' },
    { name: 'Spring Security', logo: '/assets/logos/springsecurity.svg', alt: 'Spring Security' },
    { name: 'Flyway', logo: '/assets/logos/flyway.svg', alt: 'Flyway' },
  ],
  'テスト': [
    { name: 'Vitest', logo: '/assets/logos/vitest.svg', alt: 'Vitest' },
    { name: 'JUnit 5', logo: '/assets/logos/junit5.svg', alt: 'JUnit 5' },
  ],
  '開発ツール': [
    { name: 'Docker', logo: '/assets/logos/docker.svg', alt: 'Docker' },
    { name: 'Dev Containers', logo: '/assets/logos/developmentcontainers.svg', alt: 'Dev Containers' },
    { name: 'Claude Code', logo: '/assets/logos/claudecode.svg', alt: 'Claude Code' },
    { name: 'GitHub Actions', logo: '/assets/logos/githubactions.svg', alt: 'GitHub Actions' },
    { name: 'oxlint / oxfmt', logo: '/assets/logos/oxc.svg', alt: 'oxc' },
  ],
};

const whenStuck = [
  {
    icon: '🔧',
    label: 'トラブルシューティング',
    detail: 'DevContainer が起動しない、ポートが衝突する、ロール別ログインが失敗する',
    to: '/develop/troubleshooting',
  },
  {
    icon: '📐',
    label: 'コーディング規約',
    detail: '4 レイヤーの責務、命名、テストの書き方に迷ったとき',
    to: '/develop/coding-conventions',
  },
  {
    icon: '✅',
    label: 'レビュー基準',
    detail: 'セルフレビューで何を見るか、AI レビューの 3 観点が何を判定するか',
    to: '/develop/review-criteria',
  },
  {
    icon: '🏗',
    label: 'アーキテクチャ',
    detail: '各レイヤーがどの AWS サービスに対応し、ローカルでは何に置き換わるか',
    to: '/architecture',
  },
];

export default function Home() {
  return (
    <Layout
      title="AI 駆動開発チュートリアル"
      description="施設・備品予約サービス BookFlow に機能を足しながら、Claude Code を使った開発の進め方を身につける社内チュートリアル">
      <div className={styles.root}>
        <main className={styles.main} role="main">
          <HomepageHero />

          <HomepageCurriculum />

          <section className={styles.quickLinks} aria-labelledby="when-stuck-heading">
            <div className={styles.container}>
              <h2 id="when-stuck-heading" className={styles.sectionTitle}>詰まったときに開くもの</h2>
              <div className={styles.linksGrid}>
                {whenStuck.map((item) => (
                  <Link key={item.to} to={item.to} className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                    <span className={styles.linkIcon}>{item.icon}</span>
                    <span className={styles.linkText}>{item.label}</span>
                    <span className={styles.linkDetail}>{item.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.techStackSection} aria-labelledby="tech-stack-heading">
            <div className={styles.container}>
              <h2 id="tech-stack-heading" className={styles.sectionTitle}>技術スタック</h2>
              <p className={styles.techStackDescription}>
                各レイヤーの責務と選定理由は <Link to="/architecture">アーキテクチャ</Link> と <Link to="/reference/adr">設計判断（ADR）</Link> に記録しています。
              </p>
              <div className={styles.techStackGrid}>
                {Object.entries(techStack).map(([category, items]) => (
                  <TechStackGrid key={category} category={category} items={items} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
}

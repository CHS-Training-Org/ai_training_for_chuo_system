import React from 'react';
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

export default function Home() {
  return (
    <div className={styles.root}>
      <HomepageHero />
      
      <main className={styles.main} role="main">
        <HomepageCurriculum />
        
        <section className={styles.techStackSection} aria-labelledby="tech-stack-heading">
          <div className={styles.container}>
            <h2 id="tech-stack-heading" className={styles.sectionTitle}>技術スタック</h2>
            <p className={styles.sectionDescription}>
              実務で使われるモダンなスタックで構成されています。詳細は <Link to="/overview">リポジトリ概要</Link> と <Link to="/architecture">アーキテクチャ</Link> を参照してください。
            </p>
            <div className={styles.techStackGrid}>
              {Object.entries(techStack).map(([category, items]) => (
                <TechStackGrid key={category} category={category} items={items} />
              ))}
            </div>
          </div>
        </section>
        
        <section className={styles.quickLinks} aria-labelledby="quick-links-heading">
          <div className={styles.container}>
            <h2 id="quick-links-heading" className={styles.sectionTitle}>クイックリンク</h2>
            <div className={styles.linksGrid}>
              <Link to="/curriculum" className={clsx(styles.linkCard, styles.linkCardPrimary)}>
                <span className={styles.linkIcon}>📚</span>
                <span className={styles.linkText}>学習カリキュラム</span>
              </Link>
              <Link to="/getting-started" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>🛠</span>
                <span className={styles.linkText}>環境構築手順</span>
              </Link>
              <Link to="/requirements" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>📋</span>
                <span className={styles.linkText}>要件定義</span>
              </Link>
              <Link to="/dev-workflow" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>🔄</span>
                <span className={styles.linkText}>開発ワークフロー</span>
              </Link>
              <Link to="/enhancement-catalog" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>🚀</span>
                <span className={styles.linkText}>選択課題カタログ</span>
              </Link>
              <Link to="/architecture" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>🏗</span>
                <span className={styles.linkText}>アーキテクチャ</span>
              </Link>
              <Link to="/adr" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>📝</span>
                <span className={styles.linkText}>設計判断 (ADR)</span>
              </Link>
              <Link to="/troubleshooting" className={clsx(styles.linkCard, styles.linkCardSecondary)}>
                <span className={styles.linkIcon}>🔧</span>
                <span className={styles.linkText}>トラブルシューティング</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className={styles.footer}>
        <p>
          BookFlow ドキュメントサイト &copy; {new Date().getFullYear()} 中央システム
        </p>
        <p>
          Built with Docusaurus · <Link to="https://github.com/CHS-Training-Org/ai_training_for_chuo_system">GitHub Repository</Link>
        </p>
      </footer>
    </div>
  );
}
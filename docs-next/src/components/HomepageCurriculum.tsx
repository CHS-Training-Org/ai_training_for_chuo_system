import React from 'react';
import Link from '@docusaurus/Link';
import styles from './HomepageCurriculum.module.css';

const requiredSteps = [
  {
    step: 'STEP-01',
    title: '環境構築',
    goal: 'DevContainer を起動し、ブラウザで BookFlow のダッシュボードにアクセスできる状態を作る。',
    icon: '🛠',
    path: '/getting-started',
    color: 'var(--bf-primary)',
    checkpoints: ['DevContainer 起動', 'バックエンドの health が UP', 'サインイン画面の表示'],
  },
  {
    step: 'STEP-02',
    title: 'リポジトリ運用・開発フローの理解',
    goal: 'ブランチの切り方と標準開発フロー、AI レビューの位置づけを理解し、実装を始められる状態を作る。',
    icon: '🔄',
    path: '/develop/dev-workflow',
    color: '#16A34A',
    checkpoints: ['標準開発フローを説明できる', 'AI レビューの完了条件を理解する', 'ブランチを 1 本作成する'],
  },
  {
    step: 'STEP-03',
    title: 'AI ツール導入・活用',
    goal: 'Claude Code の特性を理解する。最初の選択課題をあえて /aidlc を使わずに進め、使った場合との差を体感する。',
    icon: '🤖',
    path: '/ai-tools-guide',
    color: '#D97706',
    checkpoints: ['Claude Code のセットアップ', '/aidlc なしで 1 課題を完了', '感じた手間を PR に記載'],
  },
];

const afterSteps = [
  {
    title: '選択課題（Beginner / Intermediate / Advanced）',
    goal: 'カタログから課題を選び、Spec-first で仕様を更新してから、フロントエンドからデータベースまで縦切りで実装する。',
    icon: '🚀',
    path: '/develop/enhancement-catalog',
    color: '#DC2626',
    note: '必須ステップの完了後',
  },
  {
    title: 'コードベース理解ガイド',
    goal: '着手する機能について、処理の流れと既存テストの意図を説明できるようにする。',
    icon: '📖',
    path: '/curriculum',
    color: '#7C3AED',
    note: '随時・必須ではない',
  },
];

export default function HomepageCurriculum() {
  return (
    <section className={styles.section} aria-labelledby="curriculum-heading">
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 id="curriculum-heading" className={styles.title}>必須ステップと選択課題</h2>
          <p className={styles.description}>
            STEP-01 と STEP-02 は全員が必須で、順番に進めます。<br />
            STEP-03 は Claude Code の基本操作と標準開発フローの両方に習熟している場合に限り、任意確認で済ませられます。
          </p>
        </header>

        <div className={styles.grid}>
          {requiredSteps.map((item) => (
            <article key={item.path} className={styles.card} style={{ '--card-color': item.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                <div>
                  <span className={styles.level}>{item.step}</span>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                </div>
              </div>
              <p className={styles.cardDescription}>{item.goal}</p>
              <ul className={styles.steps}>
                {item.checkpoints.map((checkpoint) => (
                  <li key={checkpoint} className={styles.step}>
                    <span className={styles.stepDot} style={{ backgroundColor: item.color }} />
                    {checkpoint}
                  </li>
                ))}
              </ul>
              <Link to={item.path} className={styles.cardLink}>
                この STEP を進める →
              </Link>
            </article>
          ))}
        </div>

        <div className={styles.grid}>
          {afterSteps.map((item) => (
            <article key={item.path} className={styles.card} style={{ '--card-color': item.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                <div>
                  <span className={styles.level}>{item.note}</span>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                </div>
              </div>
              <p className={styles.cardDescription}>{item.goal}</p>
              <Link to={item.path} className={styles.cardLink}>
                詳しく見る →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import Link from '@docusaurus/Link';
import styles from './HomepageCurriculum.module.css';

const requiredSteps = [
  {
    step: 'STEP-01',
    title: 'キックオフと環境構築',
    goal: 'DevContainer を起動し、ブラウザで BookFlow のダッシュボードにアクセスできる状態を作る。',
    icon: '🛠',
    path: '/learn/getting-started',
    color: 'var(--bf-primary)',
    checkpoints: ['オリエンテーションに参加', 'バックエンドの health が UP', 'サインイン画面の表示'],
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
    title: '初級課題1回目（AI-DLC を使わない）',
    goal: 'Claude Code の特性を理解する。最初の Beginner 課題をあえて /aidlc を使わずに進め、使った場合との差を体感する。',
    icon: '🤖',
    path: '/develop/no-aidlc-workflow',
    color: '#D97706',
    checkpoints: ['Claude Code のセットアップ', '/aidlc なしで 1 課題を完了', '感じた手間を PR に記載'],
  },
];

const afterSteps = [
  {
    title: '初級課題2回目（AI-DLC を使う）',
    goal: 'STEP-03 と同じ課題を、今度は標準開発フロー（AI-DLC）に沿って実装し直し、エンジンが何を代行しているかを対比で捉える。',
    icon: '🚀',
    path: '/learn/curriculum#beginner-with-aidlc',
    color: '#DC2626',
    note: '必須・2〜3 時間',
  },
  {
    title: '中級課題（AI-DLC を使う）',
    goal: 'カタログから Intermediate 課題を選び、フロントエンドからデータベースまで縦切りで実装する。',
    icon: '🏔',
    path: '/develop/enhancement-catalog#intermediate',
    color: '#7C3AED',
    note: '必須・4〜7 時間',
  },
];

export default function HomepageCurriculum() {
  return (
    <section className={styles.section} aria-labelledby="curriculum-heading">
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 id="curriculum-heading" className={styles.title}>必須課題の全体像</h2>
          <p className={styles.description}>
            学習パスは 1 本です。経験年数やレベルによる分岐はなく、全員が同じ順序で進めます。<br />
            STEP-01 から中級課題まで、目安は合計 17〜24 時間です。
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

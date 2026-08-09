import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './HomepageCurriculum.module.css';

const curriculumItems = [
  {
    level: 'Level 1',
    title: '基礎・環境構築',
    description: 'DevContainer での環境構築から、リポジトリ運用ルール、AI ツールの基本操作まで。全員必須の STEP-01〜03 をカバー。',
    icon: '🛠',
    path: '/getting-started',
    color: 'var(--bf-primary)',
    steps: ['STEP-01: 環境構築', 'STEP-02: 開発フロー理解', 'STEP-03: AI ツール活用'],
  },
  {
    level: 'Level 2',
    title: '仕様理解・Spec-first',
    description: '要件定義・画面仕様・API 仕様・ER 図を読み解き、実装前に仕様を更新する Spec-first の流れを習得。',
    icon: '📋',
    path: '/requirements',
    color: '#16A34A',
    steps: ['要件定義', '画面仕様', 'API 仕様', 'ER 図'],
  },
  {
    level: 'Level 3',
    title: '実装・縦切り開発',
    description: 'フロントエンド→BFF→バックエンド→DB の縦切りで機能を実装。Server Actions、Spring Boot、PostgreSQL を実践。',
    icon: '💻',
    path: '/dev-workflow',
    color: '#D97706',
    steps: ['ブランチ戦略', '縦切り実装', 'Server Actions', 'テスト戦略'],
  },
  {
    level: 'Level 4',
    title: '選択課題・エンハンス',
    description: '難易度別（Beginner/Intermediate/Advanced）のエンハンス課題から選択。繰り返し予約・カレンダー・帳票など実務機能を追加。',
    icon: '🚀',
    path: '/enhancement-catalog',
    color: '#DC2626',
    steps: ['Beginner 課題', 'Intermediate 課題', 'Advanced 課題', 'PR・レビュー'],
  },
  {
    level: 'Level 5',
    title: '運用・振り返り',
    description: '運用ガイド、Issue 起票、学習効果測定。AI レビューとの向き合い方、継続的なスキル向上の仕組み。',
    icon: '📈',
    path: '/operations-guide',
    color: '#7C3AED',
    steps: ['運用ガイド', 'Issue 起票', '学習効果測定', '振り返り'],
  },
];

export default function HomepageCurriculum() {
  return (
    <section className={styles.section} aria-labelledby="curriculum-heading">
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 id="curriculum-heading" className={styles.title}>学習カリキュラム（5 レベル）</h2>
          <p className={styles.description}>
            初めての方は Level 1 から順に、経験者は興味のあるレベルから始めてください。<br />
            各レベルの完了を目安に、次のレベルへ進みましょう。
          </p>
        </header>
        
        <div className={styles.grid}>
          {curriculumItems.map((item) => (
            <article key={item.path} className={styles.card} style={{ '--card-color': item.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                <div>
                  <span className={styles.level}>{item.level}</span>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                </div>
              </div>
              <p className={styles.cardDescription}>{item.description}</p>
              <ul className={styles.steps}>
                {item.steps.map((step, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepDot} style={{ backgroundColor: item.color }} />
                    {step}
                  </li>
                ))}
              </ul>
              <Link to={item.path} className={styles.cardLink}>
                このレベルを始める →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
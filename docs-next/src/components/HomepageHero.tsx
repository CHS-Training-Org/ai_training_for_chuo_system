import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './HomepageHero.module.css';

export default function HomepageHero() {
  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          BookFlow ドキュメント
          <em>AI 駆動開発チュートリアル</em>
        </h1>
        <p className={styles.subtitle}>
          社内エンジニアが <strong>AI 駆動開発（Claude Code）</strong> を活用したフルスタック開発を体験、習得するための学習用リポジトリです。<br />
          施設・備品予約サービスを土台に、AI ツールを積極的に活用しながらエンハンス開発を行い、実務に近い技術スタックと開発フローを通じて実践スキルを身につけます。
        </p>
        
        <div className={styles.whyWhatHow}>
          <section className={styles.card}>
            <span className={styles.badge}>Why</span>
            <h2>なぜこのリポジトリを作ったのか</h2>
            <p>
              AI ツールを「使う」だけでなく、「開発プロセスに組み込んで使いこなす」力を養うため。
              仕様書・設計判断・コードが常に同期した状態で、AI と協調しながら実装を進める標準フローを体験できます。
            </p>
          </section>
          
          <section className={styles.card}>
            <span className={styles.badge}>What</span>
            <h2>何ができるようになるか</h2>
            <ul>
              <li>Spec-first で仕様を先に決め、AI-DLC エンジン（<code>/aidlc</code>）で計画立案〜実装までを駆動</li>
              <li>Next.js 15 + Spring Boot 4 の実務構成で、認証・承認・DB・API を一気通貫で構築</li>
              <li>セルフレビュー・AI レビュー（<code>@claude pr-review</code>）で品質を担保し、自分でマージまで完結</li>
              <li>選択課題（エンハンス）を通じて、繰り返し予約・カレンダー・帳票など実務機能を段階的に追加</li>
            </ul>
          </section>
          
          <section className={styles.card}>
            <span className={styles.badge}>How</span>
            <h2>学習の始め方</h2>
            <p>レベルに合わせて入口を選んでください。</p>
            <div className={styles.ctaGroup}>
              <Link className={clsx(styles.cta, styles.ctaPrimary)} to="/curriculum">
                📚 カリキュラムを見る
              </Link>
              <Link className={clsx(styles.cta, styles.ctaSecondary)} to="/getting-started">
                🛠 環境構築から始める
              </Link>
              <Link className={clsx(styles.cta, styles.ctaSecondary)} to="/ai-tools-guide">
                🤖 AI ツール活用ガイド
              </Link>
            </div>
          </section>
        </div>
      </div>
    </header>
  );
}
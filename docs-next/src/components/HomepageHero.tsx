import React from 'react';
import Link from '@docusaurus/Link';
import styles from './HomepageHero.module.css';

const startingPoints = [
  {
    situation: 'はじめて触る',
    steps: [
      { label: 'STEP-01：環境構築', to: '/getting-started' },
      { label: 'STEP-02：開発フローの理解', to: '/develop/dev-workflow' },
      { label: 'STEP-03：AI ツール活用', to: '/ai-tools-guide' },
    ],
  },
  {
    situation: '環境ができている',
    steps: [
      { label: '選択課題カタログから Beginner を選ぶ', to: '/develop/enhancement-catalog' },
      { label: '標準開発フローを確認する', to: '/develop/dev-workflow' },
    ],
  },
  {
    situation: '用語や仕様を調べたい',
    steps: [
      { label: '用語集', to: '/glossary' },
      { label: '仕様書インデックス', to: '/spec-index' },
      { label: '設計判断（ADR）', to: '/reference/adr' },
    ],
  },
];

export default function HomepageHero() {
  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          BookFlow ドキュメント
          <em>AI 駆動開発チュートリアル</em>
        </h1>
        <p className={styles.subtitle}>
          施設・備品予約サービス <strong>BookFlow</strong> に機能を足しながら、<br />
          Claude Code による AI 駆動開発を身につける社内チュートリアルです。
        </p>

        <div className={styles.sections}>
          <section className={styles.card}>
            <h2>なぜこのリポジトリがあるのか（Why）</h2>
            <p>
              ソフトウェア開発では、<strong>AI エージェント</strong>（指示を受けてコードを読み書きするツール。このリポジトリでは Claude Code を使います）を前提とした進め方が広がっています。
              それに伴い、AI エージェントを使って開発できる人材が求められる場面が増えています。
            </p>
            <p>
              とはいえ、AI エージェントを触ったことがなければ、何から始めればいいのか分かりません。
              必要なのはチャットで質問できることではなく、仕様を決め、コードを書かせ、出てきたものを確かめ、レビューを通してマージするところまでを AI と一緒に進めることです。
              この一連の進め方を <strong>AI 駆動開発</strong> と呼びます。
            </p>
            <p>
              ここでやるのは、その一通りを実際に動いているサービスで経験することです。
              予約サービスに機能を 1 つ足す作業を通して、Claude Code の使い方から、仕様を先に決める進め方、AI レビューとの付き合い方までを身につけます。
            </p>
          </section>

          <section className={styles.card}>
            <h2>学習を終えたときにできること（What）</h2>
            <p>AI 駆動開発を自分ひとりで回せるようになります。</p>
            <ul>
              <li>画面からデータベースまでまたがる機能を、計画から実装、レビュー、マージまで自分ひとりで仕上げられる</li>
              <li>AI エージェントに渡す情報を組み立て、意図した成果が出るように指示を出せる</li>
              <li>AI が出した計画や仕様、コードの誤りに気づき、自分で直せる</li>
              <li>どこまで AI エージェントに任せ、どこから自分で判断するのかを線引きできる</li>
              <li>最初の 1 課題は AI-DLC を使わずに進めるため、エンジンが何を代行しているのかを対比で説明できる</li>
              <li>BookFlow で身につけた進め方を、別のコードベースでも再現できる</li>
            </ul>
          </section>

          <section className={styles.card}>
            <h2>始め方（How）</h2>
            <div className={styles.startGrid}>
              {startingPoints.map((point) => (
                <div key={point.situation} className={styles.startBranch}>
                  <span className={styles.startSituation}>{point.situation}</span>
                  <ol className={styles.startSteps}>
                    {point.steps.map((step) => (
                      <li key={step.to + step.label}>
                        <Link to={step.to}>{step.label}</Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className={styles.startNote}>
              メンターとリポジトリ管理者は <Link to="/operations/operations-guide">運用ガイド</Link> へ。
              Claude Code に読ませる <Link to="/reference/claude-code">設定台帳</Link> も用意しています。
            </p>
          </section>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './HomepageHero.module.css';

const readers = [
  {
    who: '学習者',
    detail: 'プログラミングの基礎があれば、フルスタック開発と AI エージェントの経験は問いません。STEP-01 から順に進めます。',
    to: '/getting-started',
    linkLabel: 'STEP-01：環境構築',
  },
  {
    who: 'メンター',
    detail: 'PR の Approve は求められません。質問への回答と、気になった点への任意コメントで学習者を支援します。',
    to: '/operations/operations-guide',
    linkLabel: '運用ガイド（レビュー・応答方針）',
  },
  {
    who: 'リポジトリ管理者',
    detail: 'ドキュメントサイトの公開、CI、Issue ラベルの整備を担います。',
    to: '/operations/issue-registration',
    linkLabel: 'Issue 起票とラベル整備',
  },
];

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

        <div className={styles.primaryCtaWrap}>
          <Link className={clsx(styles.cta, styles.ctaPrimary)} to="/getting-started">
            STEP-01：環境構築から始める
          </Link>
        </div>

        <div className={styles.sections}>
          <section className={styles.card}>
            <h2>なぜこのリポジトリがあるのか</h2>
            <p>
              開発の現場で、<strong>AI エージェント</strong>（指示を受けてコードを読み書きするツール。このリポジトリでは Claude Code を使います）を前提とした進め方が広がっています。
              案件の要員要件に AI の活用経験が挙がることも増えました。
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
            <h2>学習を終えたときにできること</h2>
            <ul>
              <li>予約サービスに機能を 1 つ追加し、仕様の更新から実装、テスト、PR、マージまでを自分で完結させる</li>
              <li><code>/aidlc</code> に計画を立てさせ、提示された計画に納得してから実装に入る</li>
              <li>実装より先に <code>Docs/spec/</code> を更新する</li>
              <li>Next.js 15 の Server Actions から Spring Boot 4 の 4 レイヤー、PostgreSQL まで縦に貫いて変更する</li>
              <li><code>@claude pr-review</code> で AI レビューを受け、要求整合性、実装と非機能の整合性、理解度チェックの 3 観点を通す</li>
              <li>最初の 1 課題はあえて <code>/aidlc</code> を使わずに進め、後続で使ったときの差を自分の言葉で説明する</li>
            </ul>
          </section>

          <section className={styles.card}>
            <h2>想定する読者</h2>
            <ul className={styles.readerList}>
              {readers.map((reader) => (
                <li key={reader.who} className={styles.readerItem}>
                  <strong className={styles.readerWho}>{reader.who}</strong>
                  <span className={styles.readerDetail}>{reader.detail}</span>
                  <Link to={reader.to} className={styles.readerLink}>
                    {reader.linkLabel} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <h2>始め方</h2>
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
          </section>
        </div>
      </div>
    </header>
  );
}

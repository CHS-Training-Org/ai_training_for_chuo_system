# デザインシステム

> [`DESIGN.md`](https://github.com/Bizarress/AI-Development-Tutorial/blob/main/DESIGN.md) のデザイントークン（カラー・タイポグラフィ・コンポーネント）を実際の CSS で可視化したショーケースです。AI エージェントが正確な日本語 UI を生成するための仕様を、実物として確認できます。右側の見出しバーから各セクションへ移動できます。

[ショーケースを全画面で開く](./design/preview.html){ target="_blank" } ・ [DESIGN.md 原文（GitHub）](https://github.com/Bizarress/AI-Development-Tutorial/blob/main/DESIGN.md){ target="_blank" }

<div class="ds-block ds-hero">
  <div class="hero-title">Design System Preview — <em>BookFlow</em></div>
  <p>DESIGN.md から抽出したデザイントークンのカタログ。<strong>Structured Clarity（整理された明瞭さ）</strong>を方針とする、高情報密度の業務 UI。カラー・タイポグラフィ・コンポーネント・スペーシングの全値を実物として可視化しています。</p>
  <div class="hero-buttons">
    <a class="btn btn-primary btn-md" href="https://github.com/Bizarress/AI-Development-Tutorial/blob/main/DESIGN.md" target="_blank" rel="noopener">DESIGN.md を読む</a>
    <a class="btn btn-outline btn-md" href="./design/preview.html" target="_blank" rel="noopener">全画面で開く</a>
  </div>
</div>

## 01 — カラーパレット

<div class="ds-block">
  <div class="section-label">01 / Colors</div>
  <p class="section-desc">ブランドカラーは信頼感・プロフェッショナルを想起させる青。Neutral は青みがかった Slate スケールで Primary と自然に調和します。</p>
  <div class="group-label">Primary（ブランドカラー）</div>
  <div class="color-grid">
    <div class="swatch"><div class="swatch-block" style="background:#2563EB"></div><div class="swatch-info"><div class="swatch-name">Primary</div><div class="swatch-hex">#2563EB</div><div class="swatch-role">CTA・リンク・アクティブ状態（Blue 600）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#1D4ED8"></div><div class="swatch-info"><div class="swatch-name">Primary Dark</div><div class="swatch-hex">#1D4ED8</div><div class="swatch-role">ホバー・プレス時（Blue 700）</div></div></div>
  </div>
  <div class="group-label">Semantic（意味的な色）</div>
  <div class="color-grid">
    <div class="swatch"><div class="swatch-block" style="background:#16A34A"></div><div class="swatch-info"><div class="swatch-name">Success</div><div class="swatch-hex">#16A34A</div><div class="swatch-role">承認済み・完了・成功</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#D97706"></div><div class="swatch-info"><div class="swatch-name">Warning</div><div class="swatch-hex">#D97706</div><div class="swatch-role">承認待ち・注意喚起</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#DC2626"></div><div class="swatch-info"><div class="swatch-name">Danger</div><div class="swatch-hex">#DC2626</div><div class="swatch-role">却下・エラー・破壊的操作</div></div></div>
  </div>
  <div class="group-label">Neutral（Slate スケール）</div>
  <div class="color-grid">
    <div class="swatch"><div class="swatch-block" style="background:#FFFFFF; border-bottom:1px solid #E2E8F0"></div><div class="swatch-info"><div class="swatch-name">Background</div><div class="swatch-hex">#FFFFFF</div><div class="swatch-role">ページ背景</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#0F172A"></div><div class="swatch-info"><div class="swatch-name">Foreground</div><div class="swatch-hex">#0F172A</div><div class="swatch-role">本文テキスト（Slate 900）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#E2E8F0"></div><div class="swatch-info"><div class="swatch-name">Border / Input</div><div class="swatch-hex">#E2E8F0</div><div class="swatch-role">区切り線・入力枠（Slate 200）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#F1F5F9; border-bottom:1px solid #E2E8F0"></div><div class="swatch-info"><div class="swatch-name">Muted</div><div class="swatch-hex">#F1F5F9</div><div class="swatch-role">非アクティブ領域（Slate 100）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#64748B"></div><div class="swatch-info"><div class="swatch-name">Muted Foreground</div><div class="swatch-hex">#64748B</div><div class="swatch-role">補足テキスト（Slate 500）</div></div></div>
  </div>
  <div class="group-label">予約ステータス専用</div>
  <div class="color-grid">
    <div class="swatch"><div class="swatch-block" style="background:#94A3B8"></div><div class="swatch-info"><div class="swatch-name">draft</div><div class="swatch-hex">#94A3B8</div><div class="swatch-role">下書き（Slate 400）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#D97706"></div><div class="swatch-info"><div class="swatch-name">pending</div><div class="swatch-hex">#D97706</div><div class="swatch-role">承認待ち（Amber 600）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#16A34A"></div><div class="swatch-info"><div class="swatch-name">approved</div><div class="swatch-hex">#16A34A</div><div class="swatch-role">承認済み（Green 600）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#DC2626"></div><div class="swatch-info"><div class="swatch-name">rejected</div><div class="swatch-hex">#DC2626</div><div class="swatch-role">却下（Red 600）</div></div></div>
  </div>
  <div class="group-label">Dark Mode</div>
  <div class="color-grid">
    <div class="swatch"><div class="swatch-block" style="background:#020817"></div><div class="swatch-info"><div class="swatch-name">Background</div><div class="swatch-hex">#020817</div><div class="swatch-role">ダーク背景（Slate 950）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#1E293B"></div><div class="swatch-info"><div class="swatch-name">Card</div><div class="swatch-hex">#1E293B</div><div class="swatch-role">ダークカード面（Slate 800）</div></div></div>
    <div class="swatch"><div class="swatch-block" style="background:#3B82F6"></div><div class="swatch-info"><div class="swatch-name">Primary</div><div class="swatch-hex">#3B82F6</div><div class="swatch-role">ダーク時はやや明るめ（Blue 500）</div></div></div>
  </div>
</div>

## 02 — タイポグラフィ階層

<div class="ds-block">
  <div class="section-label">02 / Typography</div>
  <p class="section-desc">和文 Noto Sans JP ／ 欧文 Inter。本文の行間は 1.8（和文）、字間 0.04em で全角文字の可読性を確保します。</p>
  <div class="type-sample">
    <div style="font-size:30px; font-weight:700; line-height:1.3; letter-spacing:-0.02em;">予約 128 件 — Display</div>
    <div class="type-meta">30px / 700 / line-height: 1.3 / letter-spacing: -0.02em<span class="type-context">ダッシュボード KPI</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:24px; font-weight:600; line-height:1.3; letter-spacing:-0.01em;">会議室の予約申請 — Heading 1</div>
    <div class="type-meta">24px / 600 / line-height: 1.3 / letter-spacing: -0.01em<span class="type-context">ページタイトル</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:20px; font-weight:600; line-height:1.3;">承認ワークフロー — Heading 2</div>
    <div class="type-meta">20px / 600 / line-height: 1.3<span class="type-context">セクション見出し</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:18px; font-weight:600; line-height:1.4;">予約詳細 — Heading 3</div>
    <div class="type-meta">18px / 600 / line-height: 1.4<span class="type-context">カードタイトル</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:16px; font-weight:400; line-height:1.8; letter-spacing:0.04em;">本文テキスト — 施設・備品の予約申請を行い、承認者の確認を経て確定します。日本語は欧文より広めの行間（1.8）と字間（0.04em）で速読性を高めています。</div>
    <div class="type-meta">16px / 400 / line-height: 1.8 / letter-spacing: 0.04em<span class="type-context">本文</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:14px; font-weight:400; line-height:1.6; color:#64748B;">テーブルセル・補足テキスト — Small</div>
    <div class="type-meta">14px / 400 / line-height: 1.6<span class="type-context">テーブルセル・補足</span></div>
  </div>
  <div class="type-sample">
    <div style="font-size:12px; font-weight:400; line-height:1.5; color:#64748B;">2026年5月28日 9:00 更新 — Caption</div>
    <div class="type-meta">12px / 400 / line-height: 1.5<span class="type-context">注釈・タイムスタンプ</span></div>
  </div>
</div>

## 03 — 本文組版サンプル

<div class="ds-block">
  <div class="section-label">03 / Content</div>
  <p class="section-desc">禁則処理（行頭・行末禁止）と tabular-nums を適用した、業務 UI の標準的な本文組版。</p>
  <div class="content-preview">
    <div class="content-preview-title">予約申請の流れ</div>
    <p>BookFlow では、利用したい施設または備品を選択し、日時・利用目的を入力して予約を申請します。申請後はステータスが「承認待ち」となり、承認者の確認を待ちます。承認されると予約が確定し、却下された場合は理由とともに通知されます。</p>
    <p>キャンセルは予約日の前日まで可能です。承認済みの予約をキャンセルすると、同じ時間帯が他の利用者に開放されます。月間の予約上限は 1 ユーザーあたり 20 件です。</p>
  </div>
</div>

## 04 — 予約一覧テーブル

<div class="ds-block">
  <div class="section-label">04 / Data Table</div>
  <p class="section-desc">数字列（日時）は tabular-nums で等幅揃え。ステータスは必ず Badge コンポーネントで表現します。</p>
  <table class="data-table">
    <thead>
      <tr><th>リソース</th><th>利用日時</th><th>申請者</th><th>ステータス</th></tr>
    </thead>
    <tbody>
      <tr><td>第1会議室</td><td class="num">2026/05/28 09:00–10:30</td><td>田中 太郎</td><td><span class="badge badge-approved">承認済み</span></td></tr>
      <tr><td>プロジェクター A</td><td class="num">2026/05/28 13:00–15:00</td><td>佐藤 花子</td><td><span class="badge badge-pending">承認待ち</span></td></tr>
      <tr><td>大会議室</td><td class="num">2026/05/29 10:00–12:00</td><td>鈴木 一郎</td><td><span class="badge badge-rejected">却下</span></td></tr>
      <tr><td>応接室</td><td class="num">2026/05/30 14:30–16:00</td><td>高橋 次郎</td><td><span class="badge badge-draft">下書き</span></td></tr>
      <tr><td>備品: ノートPC</td><td class="num">2026/05/31 09:00–18:00</td><td>伊藤 美咲</td><td><span class="badge badge-cancelled">キャンセル済み</span></td></tr>
    </tbody>
  </table>
</div>

## 05 — ボタンバリエーション

<div class="ds-block">
  <div class="section-label">05 / Buttons</div>
  <p class="section-desc">承認は default（Primary）、却下・キャンセル・削除には destructive を使用します。</p>
  <div class="group-label">バリアント</div>
  <div class="row">
    <div class="item"><button class="btn btn-primary btn-md">承認</button><div class="item-label">default (Primary)</div></div>
    <div class="item"><button class="btn btn-destructive btn-md">却下</button><div class="item-label">destructive</div></div>
    <div class="item"><button class="btn btn-outline btn-md">詳細</button><div class="item-label">outline</div></div>
    <div class="item"><button class="btn btn-ghost btn-md">キャンセル</button><div class="item-label">ghost</div></div>
  </div>
  <div class="group-label">サイズ</div>
  <div class="row">
    <div class="item"><button class="btn btn-primary btn-sm">Small</button><div class="item-label">sm / h-8 / 12px</div></div>
    <div class="item"><button class="btn btn-primary btn-md">Medium</button><div class="item-label">md / h-10 / 14px</div></div>
    <div class="item"><button class="btn btn-primary btn-lg">Large</button><div class="item-label">lg / h-11 / 16px</div></div>
  </div>
</div>

## 06 — カード & バッジ

<div class="ds-block">
  <div class="section-label">06 / Cards & Badges</div>
  <p class="section-desc">Card は radius 8px・padding 24px・shadow-sm。予約ステータスは pill 形状の Badge で表示します。</p>
  <div class="card-grid">
    <div class="ui-card">
      <div class="ui-card-title">第1会議室</div>
      <p style="margin-bottom:16px;">定員 8 名 / プロジェクター・ホワイトボード完備。2026年5月28日 9:00–10:30。</p>
      <span class="badge badge-approved">承認済み</span>
    </div>
    <div class="ui-card">
      <div class="ui-card-title">プロジェクター A</div>
      <p style="margin-bottom:16px;">4K 対応モバイルプロジェクター。貸出申請は承認者の確認待ちです。</p>
      <span class="badge badge-pending">承認待ち</span>
    </div>
  </div>
  <div class="group-label">ステータス Badge 一覧</div>
  <div class="row" style="align-items:center;">
    <span class="badge badge-draft">下書き</span>
    <span class="badge badge-pending">承認待ち</span>
    <span class="badge badge-approved">承認済み</span>
    <span class="badge badge-rejected">却下</span>
    <span class="badge badge-cancelled">キャンセル済み</span>
  </div>
</div>

## 07 — フォーム要素

<div class="ds-block">
  <div class="section-label">07 / Forms</div>
  <p class="section-desc">必須項目には * マーク。フォーカスは Primary、エラーは Danger の枠 + ring で表現します。</p>
  <div class="form-group">
    <label class="form-label">利用目的 <span class="req">*</span></label>
    <input class="form-input" type="text" placeholder="入力してください">
    <div class="form-state form-state--muted">デフォルト — border: #E2E8F0 / radius: 6px</div>
  </div>
  <div class="form-group">
    <label class="form-label">利用日時 <span class="req">*</span></label>
    <input class="form-input form-input--focus" type="text" value="2026/05/28 09:00">
    <div class="form-state form-state--muted">フォーカス — border: #2563EB + ring-2 ring-primary/20</div>
  </div>
  <div class="form-group">
    <label class="form-label">メールアドレス <span class="req">*</span></label>
    <input class="form-input form-input--error" type="text" value="invalid@">
    <div class="form-state form-state--error">メールアドレスの形式が正しくありません。</div>
  </div>
</div>

## 08 — エレベーション

<div class="ds-block">
  <div class="section-label">08 / Depth & Elevation</div>
  <p class="section-desc">用途に応じた 5 段階の影。z-index 階層と対応します。</p>
  <div class="elev-grid">
    <div class="elev-card"><div class="elev-label">Level 0</div><div class="elev-desc">none — テーブル行・フォーム</div></div>
    <div class="elev-card" style="box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05);"><div class="elev-label">Level 1</div><div class="elev-desc">shadow-sm — カード・サイドバー</div></div>
    <div class="elev-card" style="box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);"><div class="elev-label">Level 2</div><div class="elev-desc">shadow-md — ドロップダウン</div></div>
    <div class="elev-card" style="box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);"><div class="elev-label">Level 3</div><div class="elev-desc">shadow-lg — モーダル</div></div>
    <div class="elev-card" style="box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);"><div class="elev-label">Level 4</div><div class="elev-desc">shadow-xl — Toast 通知</div></div>
  </div>
</div>

## 09 — スペーシングスケール

<div class="ds-block">
  <div class="section-label">09 / Spacing</div>
  <p class="section-desc">8px グリッドを基本リズムとする 6 段階のスケール。</p>
  <div class="spacing-row">
    <div class="spacing-item"><div class="spacing-block" style="width:4px;"></div><div class="spacing-value">4px<br>XS</div></div>
    <div class="spacing-item"><div class="spacing-block" style="width:8px;"></div><div class="spacing-value">8px<br>S</div></div>
    <div class="spacing-item"><div class="spacing-block" style="width:16px;"></div><div class="spacing-value">16px<br>M</div></div>
    <div class="spacing-item"><div class="spacing-block" style="width:24px;"></div><div class="spacing-value">24px<br>L</div></div>
    <div class="spacing-item"><div class="spacing-block" style="width:32px;"></div><div class="spacing-value">32px<br>XL</div></div>
    <div class="spacing-item"><div class="spacing-block" style="width:48px;"></div><div class="spacing-value">48px<br>XXL</div></div>
  </div>
</div>

## 10 — レイアウト & レスポンシブ

<div class="ds-block">
  <div class="section-label">10 / Layout & Responsive</div>
  <p class="section-desc">コンテナ最大幅とブレークポイント。業務システムのため Desktop &gt; Tablet &gt; Mobile を優先します。</p>
  <div class="group-label">コンテンツ幅</div>
  <div class="width-row"><div class="width-head">Max Container <span>1280px (max-w-screen-xl)</span></div><div class="width-bar"><div class="width-bar-inner" style="width:100%"></div></div></div>
  <div class="width-row"><div class="width-head">Main Content <span>896px (max-w-4xl)</span></div><div class="width-bar"><div class="width-bar-inner" style="width:70%"></div></div></div>
  <div class="width-row"><div class="width-head">Sidebar <span>240px (w-60)</span></div><div class="width-bar"><div class="width-bar-inner" style="width:19%"></div></div></div>
  <div class="group-label">ブレークポイント</div>
  <table class="bp-table">
    <thead><tr><th>Name</th><th>Width</th><th>主な変更</th></tr></thead>
    <tbody>
      <tr><td><code>sm</code></td><td>≥ 640px</td><td>1 カラムレイアウト</td></tr>
      <tr><td><code>md</code></td><td>≥ 768px</td><td>サイドバー → スライドオーバー切替</td></tr>
      <tr><td><code>lg</code></td><td>≥ 1024px</td><td>サイドバー固定、2→3 カラムグリッド</td></tr>
      <tr><td><code>xl</code></td><td>≥ 1280px</td><td>コンテンツ最大幅（container 有効）</td></tr>
    </tbody>
  </table>
</div>

## 11 — 推奨と禁止

<div class="ds-block">
  <div class="section-label">11 / Do's &amp; Don'ts</div>
  <div class="dodont-grid">
    <div class="dodont dodont--do">
      <h3>Do（推奨）</h3>
      <ul>
        <li>予約ステータスは必ず Badge を使用しカラー定義に従う</li>
        <li>破壊的操作には variant="destructive" を使う</li>
        <li>数字列（時刻・金額・件数）は tabular-nums で等幅揃え</li>
        <li>承認ボタンを左、却下ボタンを右に配置する</li>
        <li>必須項目には * と aria-required="true" を付与</li>
      </ul>
    </div>
    <div class="dodont dodont--dont">
      <h3>Don't（禁止）</h3>
      <ul>
        <li>ステータス専用色以外で状態を独自表現しない</li>
        <li>Primary Blue と Danger Red を同面積で並べない</li>
        <li>Card のネストは最大 2 段まで</li>
        <li>テキストのみで情報を伝達しない（色盲対応）</li>
        <li>日本語本文に line-height 1.2 以下を使わない</li>
      </ul>
    </div>
  </div>
</div>

<div class="ds-block ds-footer">
  Generated from <strong>BookFlow DESIGN.md</strong> — 社内 AI 駆動開発チュートリアル
</div>

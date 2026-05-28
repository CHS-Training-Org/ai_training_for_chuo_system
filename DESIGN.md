# DESIGN.md — BookFlow

> このファイルは AI エージェントが正確な日本語 UI を生成するためのデザイン仕様書です。
> セクションヘッダーは英語、値の説明は日本語で記述しています。

---

## 1. Visual Theme & Atmosphere

- **デザイン方針**: Structured Clarity（整理された明瞭さ）。余白と書体ウェイトで情報階層を表現し、装飾的要素（グラデーション・過剰なシャドウ）を排する
- **密度**: 高情報密度の業務 UI。テーブル・フォーム・ステータス表示が中心
- **キーワード**: クリーン・プロフェッショナル・信頼感・速読性・落ち着き

---

## 2. Color Palette & Roles

### Primary（ブランドカラー）

- **Primary** (`#2563EB` / Blue 600): メインブランドカラー。CTA ボタン・リンク・ナビゲーションアクティブ状態に使用。信頼感・プロフェッショナルを想起させる青
- **Primary Dark** (`#1D4ED8` / Blue 700): ホバー・プレス時

### Semantic（意味的な色）

- **Success** (`#16A34A` / Green 600): 承認済み・完了・成功状態
- **Warning** (`#D97706` / Amber 600): 承認待ち・注意喚起
- **Danger** (`#DC2626` / Red 600): 却下・キャンセル・エラー・破壊的操作

### Neutral（Slate スケール — 青みがかりで Primary と自然に調和）

- **Background** (`#FFFFFF`): ページ背景
- **Foreground** (`#0F172A` / Slate 900): 本文テキスト
- **Card** (`#FFFFFF`): カード・パネルの面
- **Border / Input** (`#E2E8F0` / Slate 200): 区切り線・入力欄の枠
- **Muted** (`#F1F5F9` / Slate 100): 非アクティブ領域・背景アクセント
- **Muted Foreground** (`#64748B` / Slate 500): 補足テキスト・プレースホルダー

### 予約ステータス専用

- **draft** (`#94A3B8` / Slate 400): 下書き
- **pending** (`#D97706` / Amber 600): 承認待ち
- **approved** (`#16A34A` / Green 600): 承認済み
- **rejected** (`#DC2626` / Red 600): 却下

### Dark Mode

- **Background** (`#020817` / Slate 950): ダーク背景
- **Card** (`#1E293B` / Slate 800): ダークカード面
- **Primary** (`#3B82F6` / Blue 500): ダーク時はやや明るめ

---

## 3. Typography Rules

### 3.1 和文フォント

- **ゴシック体**: Noto Sans JP（Google Fonts）— 業務システムの中立性・読みやすさに最適。ウェイトバリエーション豊富

### 3.2 欧文フォント

- **サンセリフ**: Inter（Google Fonts / 可変フォント）— UI 向け設計、x-height 高く画面での可読性優秀。数字の等幅 (tabular-nums) が時刻・金額表示に有利
- **等幅**: JetBrains Mono / Noto Sans Mono — コード・ID 表示用

### 3.3 font-family 指定

```css
/* 本文・UI */
font-family: var(--font-inter), var(--font-noto-sans-jp), system-ui, -apple-system, sans-serif;

/* 等幅 */
font-family: var(--font-mono-custom), "Noto Sans Mono", monospace;
```

**フォールバックの考え方**:
- `next/font` が注入する CSS 変数（`--font-inter`, `--font-noto-sans-jp`）を先に指定
- `system-ui` / `-apple-system` はフォント未ロード時の日本語 OS フォールバック

### 3.4 文字サイズ・ウェイト階層

| Role | Size | Weight | Line Height | Letter Spacing | 備考 |
|------|------|--------|-------------|----------------|------|
| Display | 30px / 1.875rem | 700 | 1.3 | -0.02em | ダッシュボード KPI |
| Heading 1 | 24px / 1.5rem | 600 | 1.3 | -0.01em | ページタイトル |
| Heading 2 | 20px / 1.25rem | 600 | 1.3 | 0 | セクション見出し |
| Heading 3 | 18px / 1.125rem | 600 | 1.4 | 0 | カードタイトル |
| Body | 16px / 1rem | 400 | 1.8（和文）/ 1.6（英数） | 0.04em（和文）| 本文 |
| Small | 14px / 0.875rem | 400 | 1.6 | 0 | テーブルセル・補足 |
| Caption | 12px / 0.75rem | 400 | 1.5 | 0 | 注釈・タイムスタンプ |

### 3.5 行間・字間

- **本文の行間 (line-height)**: 1.8（和文）/ 1.6（英数）— 日本語は欧文より広めが標準
- **見出しの行間**: 1.3〜1.4
- **和文字間 (letter-spacing)**: `0.04em` — 全角文字の可読性向上
- **見出し字間**: `-0.01em`〜`-0.02em`（欧文見出しの引き締め）

### 3.6 禁則処理・改行ルール

```css
word-break: keep-all;       /* CJK 単語を分割しない */
overflow-wrap: break-word;
line-break: strict;         /* 厳格な禁則: 句読点・括弧 */
```

**禁則対象**:
- 行頭禁止: `）」』】〕、。，．・：；？！`
- 行末禁止: `（「『【〔`

### 3.7 OpenType 機能

```css
font-variant-numeric: tabular-nums;  /* テーブル数字・時刻・金額を等幅揃え */
font-feature-settings: "kern" 1, "liga" 1;
```

### 3.8 縦書き

該当なし

---

## 4. Component Stylings

### Buttons

**default (Primary)**
- Background: `#2563EB` / Hover: `#1D4ED8`
- Text: `#FFFFFF`
- Padding: `8px 16px` / Border Radius: `6px`
- Font Size: `14px` / Font Weight: `500`
- Focus: `ring-2 ring-primary ring-offset-2`
- Transition: `transition-colors duration-150`

**destructive**
- Background: `#DC2626` / Hover: `#B91C1C`
- Text: `#FFFFFF`

**outline**
- Background: `transparent` / Hover: Muted (`#F1F5F9`)
- Border: `1px solid #E2E8F0`
- Text: `#0F172A`

**ghost**
- Background: `transparent` / Hover: Muted
- Text: `#0F172A`

**Sizes**
- `sm`: `h-8`, `px-3`, `text-xs`（12px）
- `md`: `h-10`, `px-4`, `text-sm`（14px）← default
- `lg`: `h-11`, `px-8`, `text-base`（16px）

タッチターゲット最小: `44×44px`（モバイル）

### Inputs

- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border (focus): `1px solid #2563EB` + `ring-2 ring-primary/20`
- Border (error): `1px solid #DC2626` + `ring-2 ring-destructive/20`
- Border Radius: `6px`
- Padding: `8px 12px` / Height: `40px`
- Font Size: `14px`
- Placeholder: `#64748B` (Muted Foreground)
- Disabled: `opacity-50`, `cursor-not-allowed`

### Cards

- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border Radius: `8px`
- Padding: `24px`
- Shadow: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (shadow-sm 相当)
- Card Header: `padding-bottom: 16px`
- Card Title: `20px / font-semibold`

### Badge（予約ステータス）

- **draft**: `bg-slate-100`, `text-slate-500` — 下書き
- **pending**: `bg-amber-100`, `text-amber-700` — 承認待ち
- **approved**: `bg-green-100`, `text-green-700` — 承認済み
- **rejected**: `bg-red-100`, `text-red-700` — 却下
- **cancelled**: `bg-slate-100`, `text-slate-400` — キャンセル済み

Font Size: `12px` / Font Weight: `500` / Padding: `2px 8px` / Border Radius: `9999px`（pill）

---

## 5. Layout Principles

### Spacing Scale

| Token | Value | 用途 |
|-------|-------|------|
| XS | 4px | アイコン内余白 |
| S | 8px | インラインアイテム間 |
| M | 16px | フォームフィールド間、カード内セクション間 |
| L | 24px | カードパディング、セクション間 |
| XL | 32px | ページセクション間 |
| XXL | 48px | ページトップ余白 |

基本リズム: **8px グリッド**（`space-y-4` = 16px が標準単位）

### Container

- Max Width: `1280px` (`max-w-screen-xl`)
- Padding: `px-4`（モバイル）/ `px-8`（lg 以上）
- `mx-auto` で中央寄せ

### Page Layout

- **Header**: `h-16`（64px）固定、`z-50`
- **Sidebar**: `w-60`（240px）固定（lg 以上）/ `w-16`（64px）アイコン折りたたみ / md 以下スライドオーバー
- **Main Content**: サイドバー有り時 `ml-60`、単独コンテンツ最大幅 `max-w-4xl`

### Grid

- 一覧系: `1col`（sm）/ `2col`（md）/ `3col`（lg）
- ダッシュボード KPI: `2col`（sm）/ `4col`（lg）
- Gutter: `16px`（gap-4）/ `24px`（gap-6）

---

## 6. Depth & Elevation

| Level | Shadow CSS | 用途 |
|-------|-----------|------|
| 0 | `none` | フラット要素（テーブル行・フォームフィールド） |
| 1 | `shadow-sm` | カード・サイドバー |
| 2 | `shadow-md` | ドロップダウン・セレクト展開 |
| 3 | `shadow-lg` | モーダル・ダイアログ |
| 4 | `shadow-xl` | Toast 通知 |

**z-index 階層**:
- base: `0` / dropdown: `50` / sticky header: `100` / overlay: `200` / modal: `300` / toast: `400` / tooltip: `500`

---

## 7. Do's and Don'ts

### Do（推奨）

- 予約ステータスは必ず Badge コンポーネントを使用し、Section 4 のカラー定義に従う
- 破壊的操作（却下・キャンセル・削除）には `variant="destructive"` ボタンを使用する
- テーブルの数字列（時刻・金額・件数）は `tabular-nums` で等幅揃えにする
- 承認ボタンを左、却下ボタンを右に配置する（ユーザーの操作ミス防止）
- フォームの必須項目には `*` マークと `aria-required="true"` を付与する
- エラーメッセージはフィールドの直下に `text-sm text-destructive` で表示する
- hover の色変化には必ず `transition-colors duration-150` を付ける
- アイコンのみのボタンには必ず `aria-label` を指定する

### Don't（禁止）

- `--color-status-*` 以外の色でステータスを独自に表現しない
- Primary Blue と Danger Red を同一画面で同等の面積で並べない
- Card のネストは最大 2 段まで（Card 内 Card 内 Card は禁止）
- テキストのみで情報を伝達しない（色盲対応: アイコン・テキスト・形状を併用）
- `font-family` に和文フォント 1 つだけを指定しない（環境依存になる）
- 日本語本文に `line-height: 1.2` 以下を使わない

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | 主な変更 |
|------|-------|---------|
| sm | ≥ 640px | 1カラムレイアウト |
| md | ≥ 768px | サイドバー → スライドオーバー切替 |
| lg | ≥ 1024px | サイドバー固定表示、2→3カラムグリッド |
| xl | ≥ 1280px | コンテンツ最大幅（container 有効） |

業務システムとしての優先順位: **Desktop > Tablet > Mobile**  
主要ユースケースは社内 PC（デスクトップ）を想定。モバイルは「マイ予約確認」「承認通知確認」に限定。

### タッチターゲット

- ボタン最小サイズ: `44×44px`（WCAG 2.1 AA 基準）
- モバイルでの Padding 拡張: `py-2` → `py-3`

### フォントサイズ調整

- モバイル本文: `14px`（`text-sm`）
- デスクトップ本文: `16px`（`text-base`）

### テーブルのレスポンシブ

- md 以下: 主要列のみ表示（リソース名・日時・ステータス）
- lg 以上: 全列表示

### サイドバー挙動

- lg 以上: 固定サイドバー（`w-60`）
- md 以下: ハンバーガーメニュー → スライドオーバー

---

## 9. Agent Prompt Guide

### クイックリファレンス

```
Primary Color:    #2563EB  /  bg-primary / text-primary
Destructive:      #DC2626  /  bg-destructive / text-destructive
Background:       #FFFFFF  /  bg-background
Foreground:       #0F172A  /  text-foreground
Muted:            #F1F5F9  /  bg-muted / text-muted-foreground (#64748B)
Border:           #E2E8F0  /  border-border
Font:             var(--font-inter), var(--font-noto-sans-jp), system-ui, sans-serif
Body Size:        16px (desktop) / 14px (mobile)
Line Height:      1.8 (和文) / 1.6 (英数) / 1.3 (見出し)
Border Radius:    6px (ボタン・インプット) / 8px (カード)

ステータス Badge:
  下書き:     bg-slate-100  text-slate-500
  承認待ち:   bg-amber-100  text-amber-700
  承認済み:   bg-green-100  text-green-700
  却下:       bg-red-100    text-red-700
```

### 標準ページ構造

```tsx
<div className="container mx-auto px-4 py-6">
  <div className="mb-6">
    <h1 className="text-2xl font-semibold tracking-tight">ページタイトル</h1>
    <p className="text-sm text-muted-foreground mt-1">サブタイトル</p>
  </div>
  {/* コンテンツ */}
</div>
```

### フォームフィールド構造

```tsx
<div className="space-y-2">
  <Label htmlFor="xxx">
    ラベル <span className="text-destructive">*</span>
  </Label>
  <Input id="xxx" aria-required="true" placeholder="入力してください" />
  <p className="text-sm text-destructive">{errorMessage}</p>
</div>
```

### 承認・却下ボタンペア

```tsx
<div className="flex gap-2">
  <Button variant="default">承認</Button>
  <Button variant="destructive">却下</Button>
</div>
```

### 日本語 UI ガイドライン

- **日付表記**: `YYYY年M月D日`（例: 2026年5月28日）
- **時刻表記**: `H:mm`（例: 9:00、14:30）
- **エラー文体**: 「〜できません」「〜してください」（敬体統一）
- **ステータスラベル**: 下書き / 承認待ち / 承認済み / 却下 / キャンセル済み

### プロンプト例

```
BookFlow のデザインシステムに従って、予約一覧テーブルを実装してください。
- プライマリカラー: bg-primary (#2563EB)
- フォント: font-sans（Inter + Noto Sans JP）
- 行間: 本文 line-height: 1.8（和文）
- ステータス表示: Badge コンポーネントを使用（approved/rejected/pending/draft）
- テーブル数字: tabular-nums で等幅揃え
- ボーダー: border-border (#E2E8F0)
- ホバー行: bg-muted (#F1F5F9)
```

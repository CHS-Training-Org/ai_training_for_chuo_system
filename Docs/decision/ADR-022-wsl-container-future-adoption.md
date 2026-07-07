---
type: adr
title: ADR-022 — 開発環境：WSL Container（wslc）の将来採用
description: WSL Container（wslc.exe）を Rancher Desktop の代替として将来採用する方針を記録し、現時点での採用を保留する判断の根拠
tags:
  - dev-environment
  - wsl
  - container
  - windows
  - rancher-desktop
timestamp: 2026-06-30
---

# ADR-022 — 開発環境：WSL Container（wslc）の将来採用

## Status

Proposed（2026-06-30）

## Context

BookFlow の Windows 開発者は現在、DevContainer を起動するために **Rancher Desktop**（`dockerd (moby)` ランタイム）を使用する。別途インストールが必要な外部ツールであり、WSL2 統合設定（Preferences → WSL → Integrations → Ubuntu を ON）という追加手順がセットアップの障壁になっている（[getting-started.md](../guide/getting-started.md) §OS 別の事前準備 参照）。

2026 年 6 月、Microsoft が **WSL Container**（`wslc.exe`）のパブリックプレビューを発表した（[DevBlogs 記事](https://devblogs.microsoft.com/commandline/wsl-container-is-now-available-for-public-preview/)、[公式ドキュメント](https://learn.microsoft.com/en-us/windows/wsl/wsl-container)）。

### WSL Container の概要と利点

| 項目 | 内容 |
|------|------|
| 提供形態 | WSL 本体に組み込み（`wsl --update` のみで取得可能） |
| 別途インストール | **不要**。Rancher Desktop が不要になる |
| ファイルシステム | virtiofs 採用により Windows ↔ Linux のファイルアクセスが約 2 倍高速化 |
| ネットワーク | consomme モードにより社内 VPN・プロキシ環境での互換性が向上 |
| VS Code DevContainer | `0.462.0-pre-release` から `wslc` をコンテナプロバイダとして指定可能 |
| GA 予定 | **2026 年秋** |

### 現時点での採用を阻む問題

BookFlow の `.devcontainer/devcontainer.json` は **Compose ベースの DevContainer** を採用している。

```json
"dockerComposeFile": "docker-compose.yml",
"service": "frontend",
```

`docker-compose.yml` は 5 サービス（`frontend` / `postgres` / `localstack` / `cognito-local` / `docs`）を同時起動する。`wslc.exe` は 2026 年 6 月時点で **`wslc compose` サブコマンドを提供していない**。現在のドキュメント・チュートリアルが示すコマンド体系は以下のみ：

- `wslc run` / `wslc exec`
- `wslc build`
- `wslc container ps / stop / prune`
- `wslc image ls / prune / inspect`
- `wslc stats`

`docker compose up` 相当の機能がなければ、現在の DevContainer 構成をそのまま移行できない。

### 候補比較（2026-06-30 時点）

| 評価軸 | Rancher Desktop | WSL Container |
|--------|----------------|---------------|
| 別途インストール | 必要 | 不要（WSL 組み込み） |
| docker compose 対応 | あり（`docker compose v2`） | **なし（プレビュー時点）** |
| DevContainer（Compose マルチサービス）| あり | **未対応** |
| ファイル I/O 速度 | 標準 | virtiofs により高速化 |
| VPN・プロキシ環境 | 設定によって不安定 | consomme により改善 |
| 安定性 | GA（安定版） | **パブリックプレビュー** |
| Windows バージョン要件 | 公式記載あり | 公式未記載 |

## Decision

**現時点では Rancher Desktop を継続採用**し、WSL Container への移行を **2026 年秋の GA 後に再評価**する。

再評価の判断基準：

1. `wslc compose`（または `wslc.exe` による Docker Compose ファイル読み込み）の正式サポート
2. VS Code Dev Containers 拡張が Compose ベース DevContainer を `wslc` バックエンドで動作させられること
3. named volume のサポート確認
4. Windows 最小バージョン要件の明示（社内受講者の PC スペックとの照合が必要）
5. パブリックプレビューから GA への昇格

上記がすべて満たされた時点で `Accepted` に更新し、[getting-started.md](../guide/getting-started.md) の「前提ソフトウェア」表および「OS 別の事前準備」セクションを改訂する。

## Consequences

- **短期**：Rancher Desktop によるセットアップフローを維持する。[getting-started.md](../guide/getting-started.md) に変更なし。
- **GA 後の作業（予定）**：
  - `.devcontainer/devcontainer.json` の `dockerComposeFile` パスはそのまま維持し、VS Code の「Docker Path」設定を `wslc` に変更するか、または `devcontainer.json` の `dockerPath` フィールドで指定する
  - [getting-started.md](../guide/getting-started.md) §OS 別の事前準備（Windows）から Rancher Desktop の WSL2 統合設定手順を削除可能になる
  - `wslc` の virtiofs により `/workspace` bind mount のビルド速度が改善される見込み（Next.js HMR・Gradle ビルド）
- **macOS / Linux 受講者への影響**：なし（`wslc.exe` は Windows 専用）

---

> **再評価タイミングの目安**：2026 年秋（Microsoft が GA を予告）。  
> GitHub Issue または PR にて本 ADR の Status を更新すること。

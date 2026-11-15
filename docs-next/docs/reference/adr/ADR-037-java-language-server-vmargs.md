---
sidebar_position: 37
type: adr
title: ADR-037 — Java の言語サーバーと Gradle daemon のメモリを減らす
description: devcontainer で常に動く Java の言語サーバー 2 つ（jdt.ls、Spring Boot）のメモリを、拡張を外さずに JVM の起動オプション（Serial GC、C1 のみの JIT、jdt.ls のヒープの上限 512MB）で減らし、使っていない Gradle daemon を 15 分で終わらせると決めた記録
tags:
  - devcontainer
  - memory
  - java
  - gradle
timestamp: 2026-11-15
---

# ADR-037 — Java の言語サーバーと Gradle daemon のメモリを減らす

## Status

Accepted（2026-11-15）

## Context

devcontainer の消費メモリを減らす取り組み（[ADR-036](./ADR-036-docs-static-serving.md)）の続きとして、VS Code をコンテナに接続すると常に動く Java の言語サーバー 2 つを対象にした（Issue #194）。

- **jdt.ls**：`redhat.java`（Extension Pack for Java に含まれる）が起動する。Java の補完、定義へのジャンプ、コンパイルエラーの表示を担い、デバッグ実行やテスト実行もこれを前提にしている。
- **Spring Boot の言語サーバー**：`vmware.vscode-spring-boot` が起動する。jdt.ls の上に、`application.yml` の補完と検証、`@Query` や SpEL の検証など、Spring 向けの補助を足す。

Spring Boot の拡張を外す案（約 0.4GB 減る）も検討したが、Spring 向けの補助がなくなるため、受講者がコードに直接触れる機会が少ないとしても採らなかった。そこで、拡張は残したまま、JVM の起動オプションでメモリを減らす方法を、運営者の PC で計測しながら探した。

計測は 2 つの状態で行った。受講者の初日に当たる「作り直した直後」の状態（jdt.ls がプロジェクトと依存ライブラリを最初から解析する）と、2 日目以降に当たる「解析済み」の状態（ウィンドウを再読み込みしただけ）である。前者は、VS Code の「Java: Clean Java Language Server Workspace」で再現した。どちらの状態でも、落ち着いた後、Java ファイルと `application.yml` を書き換えて解析し直させた後、`./gradlew bootRun` の実行中の RSS を測った。

| 版 | 起動オプション | jdt.ls：作り直した直後 | jdt.ls：解析済み | Spring：解析済み |
|---|---|---|---|---|
| V0 既定 | jdt.ls は Parallel GC（上限 2G）、Spring は G1（上限 1G） | 1,184〜1,255MB | 498MB | 411MB |
| V2 | 両方に `-XX:+UseSerialGC` | 未計測 | 438MB | 375MB |
| V1 | 両方に `-XX:+UseSerialGC -XX:TieredStopAtLevel=1` | 991〜1,200MB | 290MB | 259MB |
| V3 | V1 に加えて jdt.ls の上限を `-Xmx1G` | 882〜889MB | 未計測 | 未計測 |
| V4 | V1 に加えて jdt.ls の上限を `-Xmx512m` | 799〜807MB | 308MB | 276MB |

計測から分かったことは 2 つある。

1つは、解析済みの状態では、RSS の大半がヒープの外（GC の管理領域、JIT のコンパイラとコンパイル結果）にあったことである。ヒープは上限に遠く届いていなかった。V1 で減った分（約 360MB）のうち約 260MB は、JIT を C1 だけにした（`-XX:TieredStopAtLevel=1`）ことによる（V2 と V1 の差）。最適化の強い C2 を使わないので、C2 のコンパイラ自身と、そのコンパイル結果を置く領域が要らなくなる。

もう1つは、作り直した直後の jdt.ls は、どの GC でもヒープを上限近くまで広げたことである。初回の解析は大量の一時的なデータを作るが、上限に余裕があると JVM は全体の GC をせずにヒープを広げ続ける。広げた領域は、全体の GC の後も手放されない。V3 で、作り直した直後に全体の GC を走らせると、生存データは約 93MB だった。上限を下げると、広がり方そのものが抑えられる。上限 512MB は生存データの 5 倍以上あり、解析が終わるまでの時間（約 85 秒）も既定（約 95 秒）より延びなかった。

## Decision

**2 つの言語サーバーを Serial GC と C1 だけの JIT で起動し、jdt.ls のヒープの上限を 512MB にする（V4）。** 設定は `.devcontainer/devcontainer.json` の `customizations.vscode.settings` に置く。

- `java.jdt.ls.vmargs`：`-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Dsun.zip.disableMemoryMapping=true -Xmx512m -Xms100m -Xlog:disable`。この設定は拡張の既定値を置き換えるので、既定値のうち GC とヒープの上限以外（ヒープの初期値、ZIP のメモリマップの抑止、ログの抑止）はそのまま書く。
- `spring-boot.ls.java.vmargs`：`-XX:+UseSerialGC`、`-XX:TieredStopAtLevel=1`。拡張の既定値（`-Xmx1024m`）に足される。Spring Boot の言語サーバーは作り直した直後でも 262〜276MB にとどまったので、上限は変えない。

## Consequences

**良い点**

- 作り直した直後（受講者の初日）の jdt.ls が、約 380〜450MB 減る。
- 解析済みの状態（2 日目以降）で、2 つの言語サーバーの合計が 909MB から 584MB に、約 325MB 減る。
- 拡張機能を減らさないので、Java と Spring 向けの補助はすべて残る。

**悪い点・残る課題**

- 長く使ったときの言語サーバーの処理速度が落ちる可能性がある。C2 は、繰り返し動く処理を時間をかけて最適化するためである。初回の解析が終わるまでの時間は延びなかったが、補完などの応答の速さは計測していないので、運営者の環境で使いながら確かめる。
- 受講者が選択課題で依存ライブラリを増やすと、jdt.ls の解析に要るメモリも増える。上限 512MB で足りなくなっても jdt.ls は止まらず、一部の機能（補完、エラー表示など）が使えないまま動き続ける。あわせてヒープダンプを書き出し、「The Java Language Server encountered an OutOfMemory error」という通知を出す。受講者向けの対処は[トラブルシューティング](../../develop/troubleshooting.md#jdtls-out-of-memory)に書いた。
- 通知の「Increase Memory ..」を押すと、Java の拡張は上限を 2 倍にした `java.jdt.ls.vmargs` をワークスペースの設定（Git で管理している `.vscode/settings.json`）に書き込む。以後はこの値が `devcontainer.json` の値より優先される。受講者の変更は `main` に入らないので、影響はその受講者の環境とトランクにとどまる。
- バックエンドのデバッグ実行（`.vscode/launch.json` の「Backend」）は jdt.ls のプロセスの中で動くが、上限 512MB のままでのメモリは計測していない。計測した `./gradlew bootRun` は別のプロセスで動く。
- `devcontainer.json` の `settings` は、コンテナを作るときにだけリモート設定に書き込まれる。既存の環境では Rebuild Container が必要で、受講中の受講者（トランクに `main` が入らない。[ADR-030](./ADR-030-personal-trunk-branch-strategy.md)）には届かない。

**問題が出たときの戻し方**

jdt.ls がメモリ不足になる場合は、`-Xmx512m` を `-Xmx1G` に上げる（V3。作り直した直後は約 880MB になる）。補完やエラー表示が遅くなった場合は、`-XX:TieredStopAtLevel=1` を外す（V2。解析済みの状態の削減が約 100MB に下がる）。手元で試すときは、VS Code のリモート設定（コマンドパレットの「Preferences: Open Remote Settings (JSON)」）で 2 つの設定を上書きし、ウィンドウを再読み込みする。

## 追記（2026-11-15）使っていない Gradle daemon を 15 分で終わらせる

### Context（追記理由）

言語サーバーと同じく、VS Code を接続すると Gradle daemon も動き出す（Issue #196）。gradle-server（`vscode-gradle` 拡張。Java の拡張がプロジェクトの構成を読み込むための仲介）が daemon を起動し、ターミナルの `./gradlew bootRun` や `test` も起動の条件が同じなのでそれを使い回す。daemon は何もしなくても既定で 3 時間残り、1 つあたり約 510〜825MB を使い続ける（テストを流した後ほど大きい）。daemon のログを見ると、gradle-server は VS Code が接続するたびに、5 秒前後の間隔で daemon を 2 つずつ起動していた。コンテナを作った直後は、`postCreate.sh` が起動した分を合わせて 3 つあった。

運営者の PC で、daemon が終わるまでの時間（`org.gradle.daemon.idletimeout`）を短くして確かめた。ターミナルの `./gradlew` から使った daemon も、gradle-server が起動した daemon も、設定した時間だけ何もしなければ自分で終わった。gradle-server は動き続け、構成の読み込みが必要になると daemon を起動し直す。代わりに、daemon が終わった後の最初のビルドは遅くなる。`./gradlew test --rerun-tasks` は、daemon がある状態で 16.4〜17.3 秒、daemon がない状態からで 27.7 秒だった。

### Decision（追記）

**Gradle daemon は、15 分ビルドしなければ終わらせる。** `.devcontainer/postCreate.sh` で、コンテナの中の Gradle のユーザー設定（`~/.gradle/gradle.properties`）に `org.gradle.daemon.idletimeout=900000` を書き込む。

- 15 分にしたのは、Claude Code とやり取りしながらテストを繰り返す間は daemon を残し、ドキュメントを読む、休憩するなど、しばらく手を止めたときにメモリを空けるためである。1 分のように短いと、テストを流すたびに起動待ちが入る。
- リポジトリの `backend/gradle.properties` には書かない。書くと CI のビルドにも効くためである。
- `postCreate.sh` の中で `./gradlew dependencies` より前に書き、そこで起動する daemon にも効かせる。ただし、コンテナを作った直後は gradle-server も並行して daemon を起動する。gradle-server がこの設定を書くより先に daemon を起動した場合、その daemon には効かず、既定の 3 時間で残る。運営者の環境のログでは、gradle-server の daemon は設定を書いた後に起動していたが、順番は保証されない。

### Consequences（追記）

- 15 分以上ビルドしなかった後は、daemon の分（1 つあたり約 510〜825MB。複数あればその分）が空く。
- その後の最初のビルドは、daemon の起動待ちで約 10 秒遅くなる。
- `postCreate.sh` はコンテナを作るときに動くので、既存の環境では Rebuild Container が必要になる。手元で試すときは、`~/.gradle/gradle.properties` に同じ行を書き、`./gradlew --stop` で今ある daemon を止める。動いている daemon の終了時間は起動したときに決まるので、止めないと古い daemon が使い回される。

**問題が出たときの戻し方（追記）**

ビルドのたびに daemon の起動待ちが気になる場合は、`~/.gradle/gradle.properties` の値を大きくするか、行を消して既定の 3 時間に戻す。どちらの場合も、`./gradlew --stop` で今ある daemon を止めてから使う。


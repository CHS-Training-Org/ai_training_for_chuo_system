#!/usr/bin/env node
/**
 * 結合テストのワークフローで使う、結合テスト専用のデータベース（bookflow_e2e）を扱う。
 *
 * 学習者は、テストが撮った画面（実行のエビデンス）を見て、期待結果が成り立っているかを判断する。
 * 画面にほかのテストや過去の実行のデータが写ると、判断できなくなる。そこで、生成したテストは
 * テストごとに初期データ（scripts/seed.sql）だけの状態に戻してから動かす。
 * 開発用のデータベース（bookflow）を戻すと、学習者が手で作ったデータまで消えるため、専用のデータベースを使う。
 *
 * 使い方:
 *   node scripts/e2e-workflow/db.mjs create   専用のデータベースがなければ作る
 *   node scripts/e2e-workflow/db.mjs reset    専用のデータベースを初期データだけの状態に戻す
 *   node scripts/e2e-workflow/db.mjs reset --ids  戻したうえで、予約の ID を JSON で出す（テストの取り違えの確認に使う）
 *
 * 表は、専用のデータベースにつないで起動したバックエンドが Flyway で作る。初期データは入らないので、
 * 表ができたあとで reset を流す（scripts/e2e-workflow/run.mjs は、流す前に自分で reset する）。
 * 起動の仕方: cd backend && DB_URL=jdbc:postgresql://postgres:5432/bookflow_e2e ./gradlew bootRun
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const E2E_DATABASE = 'bookflow_e2e';
const USER = 'bookflow';

/** このスクリプトが動いているコンテナの compose のプロジェクト名。分からなければ空文字。 */
function ownComposeProject() {
  try {
    return execFileSync('docker', ['inspect', os.hostname(), '--format', '{{index .Config.Labels "com.docker.compose.project"}}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/**
 * devcontainer の postgres コンテナ。compose のプロジェクト名は環境で変わるため、サービス名のラベルで探す。
 * 別の worktree などで devcontainer を2つ動かしていると postgres も2つ見つかるので、
 * このコンテナと同じプロジェクトのものを選ぶ。バックエンドがつなぐ postgres（ホスト名 postgres）はそちらである。
 */
function postgresContainer() {
  const filters = ['--filter', 'label=com.docker.compose.service=postgres'];
  const project = ownComposeProject();
  if (project) filters.push('--filter', `label=com.docker.compose.project=${project}`);
  const ids = execFileSync('docker', ['ps', ...filters, '-q'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  if (!ids.length) throw new Error('postgres のコンテナが見つかりません。devcontainer のサービスが起動しているか確かめてください');
  if (ids.length > 1) throw new Error('postgres のコンテナが2つ以上見つかり、どれを使うか決められません。使わない devcontainer を止めてから、もう一度実行してください');
  return ids[0];
}

function psql(container, database, args, input) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', USER, '-d', database, '-v', 'ON_ERROR_STOP=1', '-q', ...args], {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function createDatabase() {
  const c = postgresContainer();
  const exists = psql(c, 'postgres', ['-Atc', `SELECT 1 FROM pg_database WHERE datname = '${E2E_DATABASE}'`]).trim() === '1';
  if (exists) return false;
  psql(c, 'postgres', ['-c', `CREATE DATABASE ${E2E_DATABASE} OWNER ${USER}`]);
  return true;
}

export function resetDatabase() {
  const c = postgresContainer();
  const tables = psql(c, E2E_DATABASE, ['-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reservations'"]).trim();
  if (tables !== '1') {
    throw new Error(`${E2E_DATABASE} に表がありません。DB_URL=jdbc:postgresql://postgres:5432/${E2E_DATABASE} でバックエンドを一度起動して、表を作ってください`);
  }
  // 途中で失敗したときに中途半端な状態を残さないよう、1つのトランザクションで流す
  psql(c, E2E_DATABASE, ['-1'], fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'seed.sql'), 'utf8'));
  return psql(c, E2E_DATABASE, ['-Atc', 'SELECT id FROM reservations ORDER BY id']).trim().split('\n').filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const cmd = process.argv[2];
    if (cmd === 'create') console.log(`${createDatabase() ? `${E2E_DATABASE} を作りました` : `${E2E_DATABASE} は既にあります`}。表は、DB_URL=jdbc:postgresql://postgres:5432/${E2E_DATABASE} でバックエンドを起動すると作られます`);
    else if (cmd === 'reset') {
      const ids = resetDatabase();
      if (process.argv.includes('--ids')) console.log(JSON.stringify(ids));
    }
    else throw new Error('使い方: node scripts/e2e-workflow/db.mjs create|reset');
  } catch (e) {
    console.error(`エラー: ${e.message}`);
    process.exitCode = 1;
  }
}

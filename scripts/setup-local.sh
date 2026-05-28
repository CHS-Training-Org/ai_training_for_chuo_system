#!/usr/bin/env bash
# setup-local.sh — BookFlow ローカル環境初回セットアップ補助スクリプト
#
# 実行タイミング：DevContainer 外でローカル開発環境を構築する際に一度だけ実行
# 実行後：docker compose -f .devcontainer/docker-compose.yml up で全サービス起動
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEVCONTAINER_DIR="${REPO_ROOT}/.devcontainer"
DOTENV_FILE="${DEVCONTAINER_DIR}/.env"

# ─── 前提チェック ───────────────────────────────────────────────────────────
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' が見つかりません。インストールしてください。" >&2
    exit 1
  fi
}

check_command docker
check_command curl

echo "=== BookFlow ローカル環境セットアップ ==="
echo "リポジトリ: ${REPO_ROOT}"
echo ""

# ─── 環境変数ファイル（frontend） ───────────────────────────────────────────
FRONTEND_ENV="${REPO_ROOT}/frontend/.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
  cp "${REPO_ROOT}/frontend/.env.local.example" "$FRONTEND_ENV"
  echo "[OK] frontend/.env.local を作成しました（.env.local.example からコピー）"
  echo "     → 必要に応じて BETTER_AUTH_SECRET などを更新してください"
else
  echo "[SKIP] frontend/.env.local は既に存在します"
fi
echo ""

# ─── cognito-local 起動 & ユーザープール初期化 ─────────────────────────────
COGNITO_ENDPOINT="http://localhost:9229"
COMPOSE_FILE="${DEVCONTAINER_DIR}/docker-compose.yml"

echo "=== cognito-local を起動中 ==="
docker compose -f "$COMPOSE_FILE" up -d cognito-local

echo "cognito-local の起動を待機中..."
MAX_WAIT=30
WAITED=0
until curl -sf "${COGNITO_ENDPOINT}/" &>/dev/null || [ "$WAITED" -ge "$MAX_WAIT" ]; do
  sleep 2
  WAITED=$((WAITED + 2))
done

if [ "$WAITED" -ge "$MAX_WAIT" ]; then
  echo "WARNING: cognito-local の起動確認がタイムアウトしました。続行します..." >&2
fi

echo "[OK] cognito-local が起動しました"
echo ""

# 既存のプール ID を確認
if [ -f "$DOTENV_FILE" ] && grep -q "^COGNITO_POOL_ID=" "$DOTENV_FILE"; then
  EXISTING_POOL_ID=$(grep "^COGNITO_POOL_ID=" "$DOTENV_FILE" | cut -d'=' -f2)
  echo "[SKIP] Cognito ユーザープールは設定済みです (ID: ${EXISTING_POOL_ID})"
else
  echo "=== Cognito ユーザープールを作成中 ==="

  RESPONSE=$(curl -sf -X POST "${COGNITO_ENDPOINT}/" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -H "X-Amz-Target: AWSCognitoIdentityProviderService.CreateUserPool" \
    -d '{
      "PoolName": "BookFlow",
      "UsernameAttributes": ["email"],
      "AutoVerifiedAttributes": ["email"],
      "Policies": {
        "PasswordPolicy": {
          "MinimumLength": 8,
          "RequireUppercase": false,
          "RequireLowercase": false,
          "RequireNumbers": false,
          "RequireSymbols": false
        }
      }
    }' 2>&1) || {
    echo "WARNING: ユーザープールの作成に失敗しました。手動で初期化してください。" >&2
    echo "  aws cognito-idp create-user-pool --endpoint-url ${COGNITO_ENDPOINT} \\" >&2
    echo "    --region ap-northeast-1 --pool-name BookFlow --username-attributes email" >&2
    RESPONSE=""
  }

  if [ -n "$RESPONSE" ]; then
    # jq があれば jq で、なければ grep/sed で ID を抽出
    if command -v jq &>/dev/null; then
      POOL_ID=$(echo "$RESPONSE" | jq -r '.UserPool.Id // empty')
    else
      POOL_ID=$(echo "$RESPONSE" | grep -o '"Id":"[^"]*"' | head -1 | sed 's/"Id":"//;s/"//')
    fi

    if [ -n "$POOL_ID" ]; then
      # .devcontainer/.env に書き出し（Docker Compose が自動読み込み）
      {
        echo "# cognito-local ユーザープール ID（setup-local.sh により生成）"
        echo "COGNITO_POOL_ID=${POOL_ID}"
      } > "$DOTENV_FILE"

      echo "[OK] ユーザープールを作成しました (ID: ${POOL_ID})"
      echo "     → ${DOTENV_FILE} に保存しました"
    else
      echo "WARNING: レスポンスからプール ID を取得できませんでした" >&2
      echo "  レスポンス: ${RESPONSE}" >&2
    fi
  fi
fi
echo ""

# ─── 完了メッセージ ─────────────────────────────────────────────────────────
echo "=== セットアップ完了 ==="
echo ""
echo "次のコマンドでフルスタックを起動できます："
echo "  docker compose -f .devcontainer/docker-compose.yml up"
echo ""
echo "DevContainer（VS Code）で開発する場合："
echo "  VS Code で「Reopen in Container」を選択してください"
echo ""
echo "各サービスの URL："
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8080"
echo "  Swagger  : http://localhost:8080/swagger-ui.html"
echo "  Postgres : localhost:5432 (bookflow / bookflow)"
echo "  LocalStack: http://localhost:4566"
echo "  Cognito  : http://localhost:9229"

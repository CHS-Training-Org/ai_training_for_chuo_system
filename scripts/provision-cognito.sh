#!/usr/bin/env bash
# =============================================================================
# scripts/provision-cognito.sh
#
# cognito-local にシードユーザーを provisioning するスクリプト（冪等）。
# aws CLI 不要。curl / jq / docker exec のみ使用。
#
# 前提:
#   - cognito-local コンテナが起動済みであること
#   - Docker CLI が使用可能であること（devcontainer 内 or ホストから実行）
#
# 使い方:
#   bash scripts/provision-cognito.sh
#
# 実行後に COGNITO_CLIENT_ID が表示されるので frontend/.env.local に設定してください。
# backend は COGNITO_JWKS_URI=http://cognito-local:9229/local_user_pool_id/.well-known/jwks.json
# を使用しており、本スクリプトで local_user_pool_id.json を同期するため変更不要です。
#
# ---- 設計上の制約 (ADR-008 補足) ----
# Better Auth 1.6.11 の cognito プロバイダは authorize/token を https:// にハードコードし
# JWKS も AWS 実ドメイン固定のため、ブラウザのホスト型 UI サインインは cognito-local では
# 成立しない。ローカルの受入検証は InitiateAuth で取得した JWT を直接 BE に渡す API 経由で
# 行う（8.1 受入手順を参照）。本番は通常の Cognito ホスト型 UI + Better Auth を使用。
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# オプション解析
# ---------------------------------------------------------------------------
JWT_EMAIL=""
for arg in "$@"; do
  case "$arg" in
    --jwt=*)
      JWT_EMAIL="${arg#--jwt=}"
      ;;
    --jwt)
      # 次の引数を使う（次の反復で処理）
      ;;
  esac
done
# --jwt <email> のケース（スペース区切り）
args=("$@")
for i in "${!args[@]}"; do
  if [ "${args[$i]}" = "--jwt" ] && [ $((i+1)) -lt "${#args[@]}" ]; then
    JWT_EMAIL="${args[$((i+1))]}"
  fi
done

# --jwt モード: JWT のみ出力して終了（provisioning 済み前提）
if [ -n "$JWT_EMAIL" ]; then
  STATE_FILE="$(dirname "$0")/.cognito-provision-state"
  if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: state file not found. Run provision-cognito.sh first." >&2
    exit 1
  fi
  CLIENT_ID=$(grep "^CLIENT_ID=" "$STATE_FILE" | cut -d= -f2)
  if curl -s --connect-timeout 2 "http://cognito-local:9229/" >/dev/null 2>&1; then
    EP="http://cognito-local:9229"
  else
    EP="http://localhost:9229"
  fi
  ID_TOKEN=$(curl -s -X POST "$EP/" \
    -H "X-Amz-Target: AmazonCognitoIdentityProviderService.InitiateAuth" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -d "{
      \"ClientId\": \"$CLIENT_ID\",
      \"AuthFlow\": \"USER_PASSWORD_AUTH\",
      \"AuthParameters\": {
        \"USERNAME\": \"$JWT_EMAIL\",
        \"PASSWORD\": \"BookFlow1234!\"
      }
    }" | jq -r '.AuthenticationResult.IdToken // empty')
  if [ -z "$ID_TOKEN" ]; then
    echo "ERROR: JWT 取得失敗。email=$JWT_EMAIL パスワード=BookFlow1234!" >&2
    exit 1
  fi
  echo "$ID_TOKEN"
  exit 0
fi

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------
POOL_NAME="BookFlowLocal"
CLIENT_NAME="BookFlowLocalClient"
STATE_FILE="$(dirname "$0")/.cognito-provision-state"

# シードパスワード（scripts/seed.sql のユーザーに対応）
USER_PASSWORD="BookFlow1234!"

# コンテナ名（docker compose のプロジェクト名に依存）
CONTAINER="${COGNITO_CONTAINER:-ai-development-tutorial_devcontainer-cognito-local-1}"

# devcontainer 内からは cognito-local hostname、ホストからは localhost:9229 を使用
if curl -s --connect-timeout 2 "http://cognito-local:9229/" >/dev/null 2>&1; then
  ENDPOINT="http://cognito-local:9229"
else
  ENDPOINT="http://localhost:9229"
fi

echo "=== BookFlow cognito-local provisioning ==="
echo "Endpoint: $ENDPOINT"
echo "Container: $CONTAINER"
echo ""

# ---------------------------------------------------------------------------
# helper: cognito-local API 呼び出し
# ---------------------------------------------------------------------------
cognito_api() {
  local target="$1"
  local body="$2"
  curl -s -X POST "$ENDPOINT/" \
    -H "X-Amz-Target: AmazonCognitoIdentityProviderService.${target}" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -d "$body"
}

# ---------------------------------------------------------------------------
# 1. プール取得 or 作成
# ---------------------------------------------------------------------------
echo "[1/5] User Pool の確認・作成..."

# state ファイルがあれば読み込む
POOL_ID=""
if [ -f "$STATE_FILE" ]; then
  POOL_ID=$(grep "^POOL_ID=" "$STATE_FILE" 2>/dev/null | cut -d= -f2 || true)
fi

# state がなければ既存プールを探す
if [ -z "$POOL_ID" ]; then
  POOL_ID=$(cognito_api "ListUserPools" '{"MaxResults":60}' | \
    jq -r --arg name "$POOL_NAME" '.UserPools[] | select(.Name == $name) | .Id' | head -1 || true)
fi

# プール作成
if [ -z "$POOL_ID" ]; then
  echo "  → 新規プール作成: $POOL_NAME"
  POOL_ID=$(cognito_api "CreateUserPool" "{
    \"PoolName\": \"$POOL_NAME\",
    \"UsernameAttributes\": [\"email\"],
    \"Policies\": {
      \"PasswordPolicy\": {
        \"MinimumLength\": 8,
        \"RequireUppercase\": true,
        \"RequireLowercase\": true,
        \"RequireNumbers\": true,
        \"RequireSymbols\": true
      }
    }
  }" | jq -r '.UserPool.Id')
  echo "  → 作成完了: $POOL_ID"

  # カスタム属性 custom:role を追加（BE の RoleJwtAuthenticationConverter が参照）
  cognito_api "AddCustomAttributes" "{
    \"UserPoolId\": \"$POOL_ID\",
    \"CustomAttributes\": [{
      \"Name\": \"role\",
      \"AttributeDataType\": \"String\",
      \"Mutable\": true
    }]
  }" > /dev/null && echo "  → custom:role 属性追加完了"
else
  echo "  → 既存プール使用: $POOL_ID"
  # 既存プールに custom:role がない場合は追加を試みる（既存なら無害なエラー）
  cognito_api "AddCustomAttributes" "{
    \"UserPoolId\": \"$POOL_ID\",
    \"CustomAttributes\": [{
      \"Name\": \"role\",
      \"AttributeDataType\": \"String\",
      \"Mutable\": true
    }]
  }" > /dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# 2. backend の JWKS URI 向け: local_user_pool_id.json を同期
#
# cognito-local は全プールで同一の RSA 鍵（kid: CognitoLocal）を使用するため、
# local_user_pool_id.json の内容は実際のプールと無関係でも JWKS 検証が通る。
# backend の COGNITO_JWKS_URI=http://cognito-local:9229/local_user_pool_id/...
# を変更しなくて済むよう、local_user_pool_id.json を常に同期する。
# ---------------------------------------------------------------------------
echo "[2/5] local_user_pool_id.json の同期（backend JWKS 用）..."
POOL_JSON=$(docker exec "$CONTAINER" cat "/app/.cognito/db/${POOL_ID}.json" 2>/dev/null || echo "")
if [ -n "$POOL_JSON" ]; then
  # Users を除いた Options のみコピー（ユーザーデータは実プールに置く）
  OPTIONS=$(echo "$POOL_JSON" | jq '.Options')
  docker exec "$CONTAINER" sh -c \
    "printf '%s' '{\"Users\":{},\"Options\":OPTS}' | \
     sed 's|OPTS|PLACEHOLDER|' > /tmp/pool.json && echo done" >/dev/null 2>&1 || true
  # sh -c 内での jq が使えないため node.js でファイルを書き込む
  docker exec "$CONTAINER" node -e "
    var fs = require('fs');
    var opts = $OPTIONS;
    var data = JSON.stringify({Users: {}, Options: opts});
    fs.writeFileSync('/app/.cognito/db/local_user_pool_id.json', data);
    console.log('written');
  " 2>/dev/null && echo "  → 同期完了" || {
    # node が使えない場合: Python フォールバック
    docker exec "$CONTAINER" sh -c \
      "cat /app/.cognito/db/${POOL_ID}.json" | \
      jq '{Users: {}, Options: .Options}' | \
      docker exec -i "$CONTAINER" sh -c 'cat > /app/.cognito/db/local_user_pool_id.json'
    echo "  → 同期完了 (fallback)"
  }
else
  echo "  → プールファイル未検出（スキップ）"
fi

# ---------------------------------------------------------------------------
# 3. アプリクライアント取得 or 作成（シークレットなし）
# ---------------------------------------------------------------------------
echo "[3/5] アプリクライアントの確認・作成..."

CLIENT_ID=""
if [ -f "$STATE_FILE" ]; then
  CLIENT_ID=$(grep "^CLIENT_ID=" "$STATE_FILE" 2>/dev/null | cut -d= -f2 || true)
fi

if [ -z "$CLIENT_ID" ]; then
  CLIENT_ID=$(cognito_api "ListUserPoolClients" \
    "{\"UserPoolId\":\"$POOL_ID\",\"MaxResults\":60}" | \
    jq -r --arg name "$CLIENT_NAME" \
    '.UserPoolClients[] | select(.ClientName == $name) | .ClientId' | head -1 || true)
fi

if [ -z "$CLIENT_ID" ]; then
  echo "  → 新規クライアント作成: $CLIENT_NAME"
  CLIENT_ID=$(cognito_api "CreateUserPoolClient" "{
    \"UserPoolId\": \"$POOL_ID\",
    \"ClientName\": \"$CLIENT_NAME\",
    \"ExplicitAuthFlows\": [
      \"ALLOW_USER_PASSWORD_AUTH\",
      \"ALLOW_REFRESH_TOKEN_AUTH\"
    ]
  }" | jq -r '.UserPoolClient.ClientId')
  echo "  → 作成完了: $CLIENT_ID"
else
  echo "  → 既存クライアント使用: $CLIENT_ID"
fi

# ---------------------------------------------------------------------------
# 4. シードユーザーの確認・作成
# ---------------------------------------------------------------------------
echo "[4/5] シードユーザーの確認・作成..."

create_or_skip_user() {
  local email="$1"
  local sub="$2"
  local pool_id="$3"
  local password="$4"
  local role="$5"  # BE の RoleJwtAuthenticationConverter が参照する custom:role クレーム

  # 存在確認
  local existing
  existing=$(cognito_api "AdminGetUser" \
    "{\"UserPoolId\":\"$pool_id\",\"Username\":\"$email\"}" 2>/dev/null | \
    jq -r '.Username // empty' || true)

  if [ -n "$existing" ]; then
    # 既存ユーザーの custom:role を確認・更新（初回スクリプト時に role なしで作成された場合の修正）
    local current_role
    current_role=$(cognito_api "AdminGetUser" \
      "{\"UserPoolId\":\"$pool_id\",\"Username\":\"$email\"}" 2>/dev/null | \
      jq -r '.UserAttributes[] | select(.Name=="custom:role") | .Value' 2>/dev/null || true)
    if [ -z "$current_role" ] || [ "$current_role" != "$role" ]; then
      cognito_api "AdminUpdateUserAttributes" "{
        \"UserPoolId\": \"$pool_id\",
        \"Username\": \"$email\",
        \"UserAttributes\": [{\"Name\": \"custom:role\", \"Value\": \"$role\"}]
      }" > /dev/null 2>&1 || true
      echo "  → スキップ（既存・custom:role=$role に更新）: $email"
    else
      echo "  → スキップ（既存）: $email"
    fi
    return
  fi

  echo "  → 作成: $email (sub=$sub, role=$role)"
  # custom:role は Spring Security の RoleJwtAuthenticationConverter が JWT クレームから取得する
  cognito_api "AdminCreateUser" "{
    \"UserPoolId\": \"$pool_id\",
    \"Username\": \"$email\",
    \"UserAttributes\": [
      {\"Name\": \"email\",         \"Value\": \"$email\"},
      {\"Name\": \"email_verified\", \"Value\": \"true\"},
      {\"Name\": \"sub\",           \"Value\": \"$sub\"},
      {\"Name\": \"custom:role\",   \"Value\": \"$role\"}
    ],
    \"MessageAction\": \"SUPPRESS\"
  }" | jq -r '.User.Username' > /dev/null

  cognito_api "AdminSetUserPassword" "{
    \"UserPoolId\": \"$pool_id\",
    \"Username\": \"$email\",
    \"Password\": \"$password\",
    \"Permanent\": true
  }" > /dev/null

  echo "    パスワード設定完了"
}

create_or_skip_user "hanako.tanaka@example.com"  "cognito-member-001"   "$POOL_ID" "$USER_PASSWORD" "MEMBER"
create_or_skip_user "ichiro.suzuki@example.com"  "cognito-approver-001" "$POOL_ID" "$USER_PASSWORD" "APPROVER"
create_or_skip_user "taro.kanri@example.com"     "cognito-admin-001"    "$POOL_ID" "$USER_PASSWORD" "ADMIN"

# ---------------------------------------------------------------------------
# 5. 状態の保存
# ---------------------------------------------------------------------------
echo "[5/5] 状態ファイルの保存..."
cat > "$STATE_FILE" <<EOF
# cognito-local provisioning state (自動生成・.gitignore 対象)
POOL_ID=$POOL_ID
CLIENT_ID=$CLIENT_ID
EOF
echo "  → $STATE_FILE"

# ---------------------------------------------------------------------------
# 動作確認: MEMBER ユーザーで InitiateAuth → sub 確認
# ---------------------------------------------------------------------------
echo ""
echo "=== 動作確認: MEMBER JWT 取得 ==="
TOKEN_RESP=$(cognito_api "InitiateAuth" "{
  \"ClientId\": \"$CLIENT_ID\",
  \"AuthFlow\": \"USER_PASSWORD_AUTH\",
  \"AuthParameters\": {
    \"USERNAME\": \"hanako.tanaka@example.com\",
    \"PASSWORD\": \"$USER_PASSWORD\"
  }
}")
ID_TOKEN=$(echo "$TOKEN_RESP" | jq -r '.AuthenticationResult.IdToken // empty')
if [ -z "$ID_TOKEN" ]; then
  echo "⚠ JWT 取得失敗: $TOKEN_RESP"
else
  SUB=$(echo "$ID_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.sub' 2>/dev/null || true)
  echo "✓ JWT 取得成功 / sub=$SUB"
fi

# JWKS 確認
JWKS_KEYS=$(curl -s "http://cognito-local:9229/local_user_pool_id/.well-known/jwks.json" | jq '.keys | length')
echo "✓ local_user_pool_id JWKS keys: $JWKS_KEYS"

# ---------------------------------------------------------------------------
# 完了メッセージ
# ---------------------------------------------------------------------------
echo ""
echo "========================================"
echo "  provisioning 完了"
echo "========================================"
echo ""
echo "Pool ID  : $POOL_ID"
echo "Client ID: $CLIENT_ID"
echo ""
echo "frontend/.env.local に以下を設定してください:"
echo "  COGNITO_USER_POOL_ID=$POOL_ID"
echo "  COGNITO_CLIENT_ID=$CLIENT_ID"
echo "  COGNITO_ISSUER=http://localhost:9229/$POOL_ID"
echo ""
echo "シードユーザー（パスワード: $USER_PASSWORD）:"
echo "  hanako.tanaka@example.com  (MEMBER  / sub=cognito-member-001)"
echo "  ichiro.suzuki@example.com  (APPROVER/ sub=cognito-approver-001)"
echo "  taro.kanri@example.com     (ADMIN   / sub=cognito-admin-001)"
echo ""
echo "受入検証コマンド例（backend 起動後）:"
echo "  MEMBER_JWT=\$(bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com)"
echo "  curl -H \"Authorization: Bearer \$MEMBER_JWT\" http://localhost:8080/api/users/me"

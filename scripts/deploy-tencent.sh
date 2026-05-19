#!/usr/bin/env bash
# 构建前端并上传到腾讯云服务器
# 用法:
#   npm run deploy:tencent          # 仅更新前端 dist
#   npm run deploy:tencent:api      # 前端 + 后端 server 并重建 api 容器
#
# 首次: cp .env.deploy.example .env.deploy 并填写 SERVER_IP

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_API=false
for arg in "$@"; do
  case "$arg" in
    --api) WITH_API=true ;;
  esac
done

if [ -f "$ROOT/.env.deploy" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.deploy"
  set +a
fi

SERVER_IP="${SERVER_IP%/}"
SSH_USER="${SSH_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/fitness-app}"
SSH_TARGET="${SSH_USER}@${SERVER_IP}"

if [ -z "$SERVER_IP" ]; then
  echo "❌ 未设置 SERVER_IP"
  echo "   请执行: cp .env.deploy.example .env.deploy"
  echo "   并填写 SERVER_IP=你的公网IP"
  exit 1
fi

echo "🚀 部署到 ${SSH_TARGET}:${REMOTE_DIR}"
echo ""

# 1. 构建前端
export SERVER_IP
"$ROOT/scripts/build-for-tencent.sh"

# 2. 上传 dist
echo ""
echo "📤 上传 dist/ ..."
scp -r "$ROOT/dist" "${SSH_TARGET}:${REMOTE_DIR}/"

echo ""
echo "🔄 确保 Docker 服务运行中 ..."
ssh "${SSH_TARGET}" "cd ${REMOTE_DIR}/deploy && docker compose up -d"

echo ""
echo "✅ 前端已更新（Nginx 会立即使用新文件）"
echo "   访问: http://${SERVER_IP}"

# 3. 可选：上传并重建后端
if [ "$WITH_API" = true ]; then
  echo ""
  echo "📤 上传 server/（不含 node_modules，镜像内会 npm install）..."
  rsync -az --delete \
    --exclude 'node_modules/' \
    --exclude '.env' \
    --exclude '.DS_Store' \
    "$ROOT/server/" "${SSH_TARGET}:${REMOTE_DIR}/server/"

  echo ""
  echo "🔨 重建 api 容器 ..."
  ssh "${SSH_TARGET}" "cd ${REMOTE_DIR}/deploy && docker compose up -d --build api"

  echo "✅ 后端已更新"
fi

echo ""
echo "完成。"

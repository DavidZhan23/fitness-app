#!/usr/bin/env bash
# 为腾讯云生产环境构建前端（静态 dist/）
# 用法: SERVER_IP=123.45.67.89 ./scripts/build-for-tencent.sh

set -e
cd "$(dirname "$0")/.."

if [ -z "$SERVER_IP" ]; then
  echo "❌ 请先设置服务器公网 IP，例如："
  echo "   SERVER_IP=123.45.67.89 ./scripts/build-for-tencent.sh"
  exit 1
fi

# 去掉可能的尾部斜杠
IP="${SERVER_IP%/}"
API_URL="http://${IP}/api"

echo "📦 构建前端..."
echo "   VITE_API_URL=${API_URL}"
echo ""

export VITE_API_URL="${API_URL}"

npm run build

echo ""
echo "✅ 构建完成: dist/"
echo "下一步（若代码在服务器 /opt/fitness-app）："
echo "   scp -r dist root@${IP}:/opt/fitness-app/"

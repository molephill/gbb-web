#!/bin/bash
# GBB 一键部署到 Vercel
# 用法: bash deploy-vercel.sh            # 预览环境
#       bash deploy-vercel.sh --prod     # 生产环境
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${BLUE}🚀 GBB 一键部署到 Vercel${NC}"

# 检查 Node 版本
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ 需要 Node.js >= 20，当前: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# 检查/安装 Vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "📦 安装 Vercel CLI..."
  npm install -g vercel
fi
echo -e "${GREEN}✅ Vercel CLI: $(vercel --version)${NC}"

# 检查登录
if ! vercel whoami &> /dev/null; then
  vercel login
fi
echo -e "${GREEN}✅ 已登录: $(vercel whoami)${NC}"

# 部署模式
PROD_FLAG=""
for arg in "$@"; do
  case $arg in
    --prod|-p) PROD_FLAG="--prod" ;;
  esac
done

if [ -n "$PROD_FLAG" ]; then
  echo -e "${BLUE}🎯 部署模式: 生产环境${NC}"
else
  echo -e "${YELLOW}🎯 部署模式: 预览环境（加 --prod 部署生产）${NC}"
fi

echo -e "${BLUE}🚀 开始部署...${NC}"
vercel $PROD_FLAG --yes
echo -e "${GREEN}✅ 部署完成！${NC}"
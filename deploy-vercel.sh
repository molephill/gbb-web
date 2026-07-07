#!/bin/bash
# ========================================
#   GBB 一键部署到 Vercel
#   用法: bash deploy-vercel.sh            # 预览环境
#         bash deploy-vercel.sh --prod     # 生产环境
# ========================================

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 GBB 一键部署到 Vercel${NC}"
echo "================================"

# 1. 检查 Node 版本
echo -e "${BLUE}📋 [1/5] 检查环境...${NC}"
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ 需要 Node.js >= 20，当前: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# 2. 检查/安装 Vercel CLI
echo -e "${BLUE}📦 [2/5] 检查 Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
  echo "正在安装 Vercel CLI..."
  npm install -g vercel
fi
echo -e "${GREEN}✅ Vercel CLI: $(vercel --version)${NC}"

# 3. 检查登录
echo -e "${BLUE}🔐 [3/5] 检查登录状态...${NC}"
if ! vercel whoami &> /dev/null; then
  echo -e "${YELLOW}请在浏览器中完成登录...${NC}"
  vercel login
fi
echo -e "${GREEN}✅ 已登录: $(vercel whoami)${NC}"

# 4. 选择部署模式
PROD_FLAG=""
for arg in "$@"; do
  case $arg in
    --prod|-p) PROD_FLAG="--prod" ;;
  esac
done

if [ -n "$PROD_FLAG" ]; then
  echo -e "${BLUE}🎯 [4/5] 部署模式: ${GREEN}生产环境${NC}"
else
  echo -e "${BLUE}🎯 [4/5] 部署模式: ${YELLOW}预览环境${NC}（加 --prod 部署到生产）"
fi

# 5. 部署
echo -e "${BLUE}🚀 [5/5] 开始部署...${NC}"
echo "--------------------------------"

vercel $PROD_FLAG --yes

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}================================${NC}"
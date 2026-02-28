# GBB-3 跨平台彩票数据分析工具

GBB 彩票分析工具的跨平台重写版本，支持 Windows、macOS、Linux 和 Web 浏览器。

## 项目架构

```
gbb-3/
├── packages/
│   ├── core/          # 核心业务逻辑 (纯 TypeScript)
│   ├── web/           # Web 应用 (Next.js 15)
│   ├── desktop/       # 桌面应用 (Electron 34)
│   └── config/        # 配置文件 (JSON)
├── package.json       # 根目录配置
├── pnpm-workspace.yaml
└── turbo.json
```

## 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | Next.js 15 + React 19 | SSR/SSG、App Router |
| UI 组件 | shadcn/ui | 可复制组件，完全可定制 |
| 布局系统 | Golden Layout | 自由拖拽布局，类似 VS Code |
| 桌面框架 | Electron 34 | 跨平台桌面应用 |
| 状态管理 | Zustand + TanStack Query | 轻量级状态管理 |
| 构建工具 | Turborepo + PNPM | Monorepo 管理 |
| 类型检查 | TypeScript 5 | 类型安全 |
| 样式方案 | Tailwind CSS | 原子化 CSS |

## 功能特性

- **12 种解析模式**: 趋势图、大小、单双、一条龙等
- **响应式设计**: 移动端炒股风格界面，桌面端多面板布局
- **PWA 支持**: 可安装到桌面/主屏幕，支持离线访问
- **数据同步**: Desktop 端抓取数据，Web 端从 Gitee 读取
- **推送通知**: Web Push API 数据更新通知

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动所有开发服务
pnpm dev

# 单独启动 Web 应用
cd packages/web && pnpm dev

# 单独启动桌面应用
cd packages/desktop && pnpm dev
```

### 构建

```bash
# 构建所有包
pnpm build

# 单独构建
cd packages/core && pnpm build
cd packages/web && pnpm build
cd packages/desktop && pnpm build
```

## 包说明

### @gbb/core

核心业务逻辑包，包含：

- 12 种数据解析器
- 统计计算模块
- 类型定义
- 工具函数

```typescript
import { dataLoader, parse1, statisticsManager } from '@gbb/core';

// 加载数据
dataLoader.loadFromJson(jsonData);

// 解析数据
const result = parse1(titles);

// 获取统计信息
const info = statisticsManager.getResultInfo(1, 1, 0);
```

### @gbb/web

Web 应用包，包含：

- Next.js 15 应用
- shadcn/ui 组件
- Golden Layout 集成
- API 路由
- PWA 配置

### @gbb/desktop

桌面应用包，包含：

- Electron 主进程
- Puppeteer 数据抓取
- Git 同步功能
- IPC 通信

### @gbb/config

配置文件包，包含：

- 菜单配置
- 解析规则

## 部署

### Web 部署

使用 Vercel 自动部署：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 桌面应用打包

```bash
cd packages/desktop
pnpm dist
```

打包后的文件位于 `out/` 目录。

## 许可证

MIT

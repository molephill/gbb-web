# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

GBB-3 是一个彩票数据分析工具，采用 Monorepo 架构，支持 Web (Next.js 15) 和 Desktop (Electron 34) 两种运行方式。核心业务逻辑位于 `@gbb/core` 包，可以被其他包共享使用。

## 常用命令

```bash
# 安装依赖（必须使用 pnpm）
pnpm install

# 开发模式 - 启动所有包的开发服务
pnpm dev

# 单独启动 Web 应用
cd packages/web && pnpm dev

# 单独启动 Desktop 应用（需要先构建）
cd packages/desktop && pnpm dev

# 构建所有包
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 清理所有构建产物
pnpm clean
```

### 各包单独命令

**@gbb/core**
```bash
cd packages/core
pnpm build    # TypeScript 编译
pnpm dev      # tsc --watch
pnpm lint     # 类型检查 (tsc --noEmit)
```

**@gbb/web**
```bash
cd packages/web
pnpm dev      # Next.js 开发服务器 (端口 3000)
pnpm build    # 生产构建
pnpm start    # 启动生产服务器
pnpm lint     # ESLint 检查
```

**@gbb/desktop**
```bash
cd packages/desktop
pnpm build    # 编译 main/preload 进程
pnpm dev      # 构建并启动 Electron
pnpm dist     # 打包成安装程序 (输出到 out/)
```

## Monorepo 结构

```
gbb-3/
├── packages/
│   ├── core/          # 纯 TypeScript 核心逻辑，无平台依赖
│   ├── web/           # Next.js 15 + React 19 Web 应用
│   ├── desktop/       # Electron 34 桌面应用
│   └── config/        # 共享配置文件（菜单配置等）
├── package.json       # 根 package.json（工作区定义）
├── turbo.json         # Turborepo 任务配置
└── pnpm-workspace.yaml
```

### 包依赖关系

- `@gbb/web` 依赖 `@gbb/core`、`@gbb/config`
- `@gbb/desktop` 依赖 `@gbb/core`、`@gbb/config`
- `@gbb/core` 无任何平台依赖，可独立使用

### Turborepo 任务说明

- `build`: 包间有依赖关系，core 必须先构建
- `dev`: 持久化任务，无缓存
- `lint`: 并行执行
- `clean`: 无缓存

## 核心架构

### @gbb/core 解析器架构

核心包提供 12 种数据解析模式，所有解析器继承自 `ParserBase`：

```typescript
// 解析器命名约定
Parse1, parse1    // 趋势图/大小/单双
Parse2, parse2    // ...
Parse3, parse3
// ... 直到 Parse12
```

**解析器模式**：
- 每个解析器是一个类，继承 `ParserBase`
- 提供对应的函数式 API（如 `parse1(titles)`）
- 解析器通过 `dataLoader.getAllData()` 获取数据
- 统计信息通过 `statisticsManager` 统一管理

**统计管理器**：
- `statisticsManager.getOrCreate(menuId, subMenuId, index, title, placement)` - 获取或创建统计信息
- `statisticsManager.getResultInfo(menuId, subMenuId, index)` - 获取统计结果
- `statisticsManager.fillYear(kStatistics, show, drawData)` - 填充年度统计

### 数据流

1. **数据加载**: `dataLoader.loadFromJson(jsonData)` → 加载到内存
2. **数据解析**: `parseX(titles)` → 返回 `ParsedData` (四维数组)
3. **统计更新**: 解析过程中自动更新 `statisticsManager`

### IPC 通信 (Desktop)

Electron 主进程通过以下 IPC channel 与渲染进程通信：

- `fs-readFile` - 读取文件
- `fs-readJson` - 读取 JSON 文件
- `fs-exists` - 检查文件是否存在
- `fs-readdir` - 读取目录
- `app-getPath` - 获取应用路径
- `app-getDataPath` - 获取数据路径 (extends 目录)

### 响应式设计 (Web)

Web 应用采用移动优先设计：
- 移动端：`MobileHomePage` - 炒股风格界面
- 桌面端：`DesktopHomePage` - Golden Layout 多面板布局
- 通过 CSS 媒体查询控制显示

## 代码风格

项目使用 Prettier 格式化，配置见 `.prettierrc`：
- 单引号
- 分号
- 2 空格缩进
- 行宽 100 字符
- 尾随逗号 (ES5)

## 重要约定

1. **包间引用**: 使用工作区协议 `@gbb/xxx`，版本号使用 `*`
2. **Node 版本**: 要求 Node.js >= 20.0.0
3. **类型安全**: core 包使用 `tsc --noEmit` 进行类型检查
4. **Electron 开发**: desktop 开发时会加载 `http://localhost:3000`，需确保 web 服务已启动
5. **解析器命名**: 新增解析器需同时导出类和函数，并在 `src/index.ts` 中统一导出

## 数据格式

**开奖数据** (`LotteryDraw`):
```typescript
{
  id: string;          // 期号
  draw_date: string;   // YYYY-MM-DD
  results: string;     // 开奖号码，如 "12345"
}
```

**解析结果** (`ParsedData`): 四维数组 `CellValue[][][][]`

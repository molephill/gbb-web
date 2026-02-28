# GBB 桌面应用

基于 Electron 34 的跨平台桌面应用。

## 功能特性

- 使用 Puppeteer 抓取最新彩票数据
- 通过 Git 同步数据到 Gitee 仓库
- 嵌入 Web 应用作为 UI
- 跨平台支持 (Windows, macOS, Linux)

## 开发

```bash
# 安装依赖
pnpm install

# 构建主进程和预加载脚本
pnpm build

# 启动开发模式
pnpm dev

# 打包应用
pnpm dist
```

## 技术栈

- Electron 34
- Puppeteer (数据抓取)
- simple-git (Git 同步)
- TypeScript 5

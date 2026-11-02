# JY Archive

JY Archive（项目目录名：Jy os）是一个以「把日常，慢慢收进来」为主题的 Vue 3 + Vite 前端应用。它将桌面式启动页、人物档案、AI 对话、个人资料、主题与小组件收纳在一个轻量的单页应用中。

> 当前项目处于持续开发阶段。界面和数据结构可能会调整；使用前请先阅读下方的数据与隐私说明。

## 功能概览

- **桌面与开屏**：以桌面和 Dock 作为应用入口，提供独立的开屏进入体验。
- **人物档案**：创建和编辑角色的姓名、详细设定、生日、年龄、职业、性别、头像与收藏状态。
- **AI 聊天**：按联系人管理对话，配置聊天预设、人物设定、用户人设和每位联系人的聊天选项。
- **兼容 OpenAI 风格的 API**：可填写 Base URL、API Key 和模型名称；支持从兼容的 `/models` 接口拉取模型列表。具体可用性取决于服务商的接口、跨域策略和模型能力。
- **聊天体验设置**：支持角色回复前的简短思绪摘要、角色状态栏、短期记忆轮数、引用消息和回复格式修复等功能。
- **提示词宏**：聊天预设和人物设定中可使用 `{{user}}` / `<user>` 表示当前绑定用户名称，`{{char}}` / `<char>` 表示当前聊天角色名称；另支持用户与角色设定内容宏。
- **主题与桌面小组件**：自定义壁纸、图标风格、玻璃效果，并将可用小组件添加到桌面。
- **本地持久化**：设置、角色、聊天记录和桌面配置使用浏览器 IndexedDB 保存；部分临时或展示数据使用 localStorage。
- **PWA 基础支持**：包含 Web App Manifest 和由 Vite PWA 插件生成的 service worker，浏览器支持情况与安装入口因平台而异。

## 技术栈

- Vue 3（Composition API）
- Vite 8
- vite-plugin-pwa / Workbox
- 原生 IndexedDB 与 Fetch API

## 本地运行

需要安装 Node.js（建议使用当前受支持的 LTS 版本）和 npm。

```bash
npm install
npm run dev
```

Vite 开发服务器默认端口为 `5173`，并监听网络接口以便在局域网设备上访问。生产构建及本地预览：

```bash
npm run build
npm run preview
```

## 部署到 Cloudflare Workers

仓库包含 `wrangler.jsonc`，可将 Vite 生成的 `dist/` 静态文件作为 Workers Static Assets 部署，并将单页应用路由回退到 `index.html`。项目根目录执行：

```bash
npm install
npm run deploy
```

`npm run deploy` 会先运行生产构建，再调用 Wrangler 发布。首次部署时按 Wrangler 提示登录 Cloudflare。若在 Cloudflare Dashboard 的 Workers 构建设置中部署，填写：

- **Build command**：`npm run build`
- **Deploy command**：`npx wrangler deploy`
- **Root directory**：仓库根目录（留空或 `/`）

不要把 `dist` 填入 Deploy command；它是构建输出目录，Wrangler 会从 `wrangler.jsonc` 中的 `assets.directory` 读取它。

## 配置 AI 服务

在应用的「设置 → API 配置」中填写服务商提供的 Base URL、API Key 和模型名称，然后保存配置。聊天请求使用 OpenAI 兼容的 `/chat/completions` 接口；模型列表读取使用 `/models`。部分服务商可能要求不同的 URL、请求格式、模型名或浏览器跨域配置。

**不要将 API Key 写进源代码、README、截图或提交到 Git 仓库。** API Key 由用户在浏览器应用设置中录入并存储在本机浏览器数据中。当前这是纯前端应用，聊天请求由用户的浏览器直接发送到其配置的 API 服务；API 服务商仍会收到请求内容及其自身要求的鉴权信息。使用前请确认服务商的隐私政策和数据处理方式。

## 数据与隐私

本应用目前没有自带的用户账号、云端同步或应用后端。角色档案、聊天记录、用户人设、API 设置及桌面配置保存在当前浏览器的站点存储中，不会由本项目代码主动上传到 JY Archive 的自有服务器。清除浏览器站点数据、切换浏览器或设备可能导致这些数据无法继续访问；卸载 PWA 或浏览器也可能影响本地数据。重要内容请自行备份。

当用户使用 AI 聊天时，相关提示词、聊天上下文和 API Key 会按请求发送到用户配置的模型服务商。请勿在聊天内容中放入不应交给该服务商处理的敏感信息。

## 浏览器与 PWA

应用面向现代浏览器构建。安装为 PWA 通常需要 HTTPS（本地开发时 localhost 可用于测试）；各浏览器的安装方式和能力不同，Safari/iOS 通常需要从分享菜单添加到主屏幕。PWA 支持仍在完善中，浏览器覆盖和离线体验尚未完成全面实测。离线时，已经缓存的应用资源可能可用，但 AI 对话需要网络和可访问的模型 API。

## 项目结构

```text
src/
  apps/                 应用入口注册
  components/           桌面、Dock、图标和小组件界面
  composables/          可复用组合式逻辑
  pages/                桌面应用页面（聊天、人物、设置、主题美化）
  stores/               浏览器存储、设置和主题状态
  styles/               全局与设置页面样式
  widgets/              小组件目录
public/                 静态资源、favicon 与离线页面
index.html              应用 HTML 入口
vite.config.js          Vite 与 PWA 配置
```

## 版权所有与使用声明

Copyright © 2026 JY Archive 作者。保留所有权利。

本项目及其源代码、界面设计、视觉素材、文案、应用名称与标识均为作者所有。未经作者事先书面许可，任何个人或组织不得复制、转载、镜像、分发、修改、改编、再发布或以其他方式使用本项目的全部或实质性部分；不得抄袭、窃取或冒用本项目的创意、设计、代码、素材及名称；不得将本项目或其衍生内容用于销售、收费提供、商业化运营或其他商业用途。

本仓库公开仅供查看，不构成对任何人复制、修改、分发、商业使用或其他用途的授权。当前仓库不附带开源许可证；如需使用、引用或合作，请先联系作者并取得明确的书面许可。未经许可的使用可能侵犯作者依法享有的权利。

## 开源与贡献

欢迎通过 GitHub Issues 反馈问题或提出改进建议。提交代码前请先运行 `npm run build`，并避免提交 API Key、个人聊天记录、浏览器导出数据、`node_modules` 或构建产物。向本项目提交贡献前，请确认你有权提交相关内容；除非作者另行书面同意，提交贡献不意味着作者放弃本声明中的权利。

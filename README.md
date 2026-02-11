# 🎾 TennisRank Edge (Cloudflare D1 版)

这是一个基于 **Nuxt 3** 全栈框架开发的现代化网球积分排名系统。它采用了 **垂直切片架构 (Vertical Slice Architecture)**，专为 **Cloudflare Pages** 和 **D1 (边缘 SQL 数据库)** 打造，拥有极致的性能、极低的延迟和完美的移动端适配。

## 🌟 技术栈

- **框架**: Nuxt 3 (Vue 3 + Nitro)
- **数据库**: Cloudflare D1 (SQLite at the Edge)
- **ORM**: Drizzle ORM
- **UI**: Tailwind CSS + Lucide Icons
- **架构**: 垂直切片 (按业务功能分层) + SWR 缓存策略

---

## 🚀 部署指南 (Cloudflare Pages + GitHub)

请严格按照以下步骤操作，将项目部署到 Cloudflare Pages。

### 第一步：准备 GitHub 仓库

1. 在 GitHub 上创建一个新的仓库（例如 `tennis-rank-edge`）。
2. 在本地项目根目录初始化 Git 并提交代码：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/tennis-rank-edge.git
   git push -u origin main
   ```

### 第二步：创建 Cloudflare D1 数据库

你需要先在 Cloudflare 上创建一个数据库，并获取它的 ID。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **D1**。
3. 点击 **Create database**。
4. 命名为 `tennis-rank-db`，点击创建。
5. **重要**：复制生成的 `Database ID`。
6. 记下刚才复制的 `Database ID`，后续在 Cloudflare Pages 的 **Settings -> Functions -> D1 bindings** 中直接选择该数据库并绑定变量名 `DB`（无需在仓库中提交 wrangler 配置文件）。

### 第三步：连接 Cloudflare Pages

1. 回到 Cloudflare Dashboard，进入 **Workers & Pages** -> **Overview**。
2. 点击 **Create application** -> **Pages** -> **Connect to Git**。
3. 选择你的 GitHub 账号和刚才创建的仓库 (`tennis-rank-edge`)。
4. **配置构建设置 (Build settings)**：
   - **Framework preset**: 选择 `Nuxt`。
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 点击 **Save and Deploy**。

*注意：第一次部署可能会成功，但应用会报错，因为数据库绑定还没生效，且表结构还没创建。这是正常的。*

### 第四步：配置数据库绑定 (Binding)

通过 Pages 界面连接 Git 部署时，需要在 Dashboard 手动添加 D1 绑定。

1. 在你的 Pages 项目页面，点击 **Settings** -> **Functions**。
2. 找到 **D1 database bindings** 部分。
3. 点击 **Add binding** (或 Edit)。
   - **Variable name**: 输入 `DB` (必须是大写，与代码一致)。
   - **D1 database**: 选择你刚才创建的 `tennis-rank-db`。
4. 点击 **Save**。
5. 转到 **Deployments** 标签页，点击最新的部署右侧的三个点，选择 **Retry deployment** (重新部署) 以使绑定生效。

### 第五步：初始化数据库表结构 (Schema Migration)

现在应用已经运行在边缘节点了，但数据库是空的。我们需要在本地生成 SQL 文件并推送到远程 D1 数据库。

1. 在本地生成 SQL 迁移文件：
   ```bash
   npm run db:generate
   ```
   这会在项目根目录生成一个 `drizzle` 文件夹，里面包含 SQL 文件。

2. 将表结构应用到远程 Cloudflare D1 数据库：
   *(你需要先在本地安装 Wrangler CLI 并登录：`npm install -g wrangler` 然后 `wrangler login`)*
   
   ```bash
   npx wrangler d1 migrations apply tennis-rank-db --remote
   ```
   *系统会提示你确认，按 `y` 回车。*

### 🎉 完成！

打开 Cloudflare Pages 提供的域名（例如 `https://tennis-rank-edge.pages.dev`），你应该能看到应用已成功运行。

---

## 🛠️ 本地开发 (Local Development)

如果你想在本地运行并测试：

1. 安装依赖：
   ```bash
   npm install
   ```

2. 确保 Cloudflare Pages 项目中已添加 D1 绑定（变量名 `DB`）。

3. 生成本地开发用的 D1 数据库结构：
   ```bash
   npm run db:generate
   npm run db:push:local
   ```

4. 启动开发服务器：
   ```bash
   npm run dev
   ```
   Nuxt 会自动模拟 Cloudflare 环境。

---

## 📂 目录结构 (垂直切片)

```
/
├── features/               # 🚀 业务功能模块
│   ├── ranking/            # 排行榜功能
│   └── match-manager/      # 比赛录入功能
├── shared/                 # 🛠️ 共享代码
│   ├── database/           # 数据库 Schema
│   └── components/         # 通用 UI 组件
├── server/                 # ⚡ 后端 API (Nitro)
└── pages/                  # 🛣️ 页面路由
```

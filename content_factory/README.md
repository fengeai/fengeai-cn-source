# Content Assistant Studio

一个从零开始构建的内容生产专用 AI 助理。

## 目标

一期只解决 4 个问题：

1. 管理选题
2. 生成内容简报
3. 生成文章初稿
4. 生成多平台改写版本

## 项目结构

```text
content-assistant-studio/
  apps/
    api/        Fastify API
    web/        Next.js Web 控制台
  docs/
    blueprint.md
  packages/
    shared/     共享类型与工具
```

## 开发原则

- 先做可用 MVP，再做自动化
- 先人工可控，再增加 Agent
- 先沉淀内容资产，再扩展发布和复盘

## 当前状态

这是新的干净项目骨架，后续将在这里继续实现。

## API 开发准备

进入 [apps/api](/E:/Claude%20code/ai-content-production/content-assistant-studio/apps/api) 后可按下面步骤初始化数据库：

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
```

默认使用 SQLite，本地会生成 `dev.db`，适合我们先把主流程做通。

## 智谱模型配置

如果你希望内容生成调用智谱模型，请在本地 `apps/api/.env` 中填写：

```bash
LLM_PROVIDER="zhipu"
ZHIPU_API_KEY="你的本地 key"
ZHIPU_MODEL="glm-4.5-flash"
```

如果不填写 `ZHIPU_API_KEY`，系统会自动回退到本地规则生成逻辑，方便继续开发前后端流程。

## 第四轮后测试顺序

建议你在本地按下面顺序启动后再测试：

```bash
cd E:\Claude code\ai-content-production\content-assistant-studio
npm install

cd apps\api
copy .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

然后新开一个终端：

```bash
cd E:\Claude code\ai-content-production\content-assistant-studio
npm run dev:web
```

测试路径建议：

1. 打开 `/topics`
2. 新建一个 Topic
3. 点击“设为选中”
4. 点击“生成文章”
5. 跳转到文章工作台后检查正文和多平台版本

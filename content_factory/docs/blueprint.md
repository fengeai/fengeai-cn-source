# 内容生产助理蓝图

## 产品定位

这是一个服务于个人创作者和小团队的内容生产助手，不追求一开始全自动，而是先把内容工作流做顺。

## 一期范围

- 选题管理
- 内容简报生成
- 文章大纲与初稿生成
- 多平台改写
- 内容历史记录

## 核心模块

### Web

- Dashboard
- Topics
- Article Workspace
- Content Library

### API

- Topic Service
- Brief Service
- Article Service
- Variant Service

### 后续模块

- Review Service
- Task Queue
- Publish Service
- Analytics Service

## 推荐技术栈

- Web: Next.js + TypeScript
- API: Fastify + TypeScript
- DB: PostgreSQL + Prisma
- Queue: BullMQ
- AI: OpenAI 兼容 Provider Adapter

## 一期原则

- 每次生成都保留输入参数
- 每次生成都保留结果版本
- 每个平台的改写是独立实体
- 所有自动化能力都可手动覆盖

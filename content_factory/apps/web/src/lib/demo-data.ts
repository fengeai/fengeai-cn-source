import type { Article, Topic } from '@content-assistant/shared';

export const demoTopics: Topic[] = [
  {
    id: 'topic-1',
    title: 'AI 编程初学者如何搭建自己的内容工作台',
    summary: '从零搭建适合个人内容生产的 AI 工作流。',
    audience: 'AI 编程初学者',
    angle: '从流程设计而不是工具堆砌切入',
    keywords: ['AI 编程', '内容工作台', '工作流'],
    status: 'selected',
    createdAt: '2026-03-12T09:00:00.000Z',
  },
  {
    id: 'topic-2',
    title: '为什么内容团队需要自己的品牌语气库',
    summary: '把一次性 prompt 变成可复用的内容系统。',
    audience: '内容运营团队',
    angle: '沉淀长期内容资产',
    keywords: ['品牌语气', 'Prompt 模板', '内容资产'],
    status: 'draft',
    createdAt: '2026-03-12T10:00:00.000Z',
  },
];

export const demoArticles: Article[] = [
  {
    id: 'article-demo-1',
    topicId: 'topic-1',
    title: 'AI 编程初学者如何搭建自己的内容工作台',
    status: 'draft',
    outline: [
      '开场：为什么现在就要搭内容工作台',
      '问题背景：为什么只会问模型还不够',
      '操作步骤：从选题到改写的最小流程',
      '结尾：把工作流沉淀成资产',
    ],
    brief: {
      hook: '很多人会用 AI，但还不会用 AI 稳定做内容。',
      promise: '这篇内容帮助初学者从零搭出自己的内容生产闭环。',
      keyPoints: ['先有选题台', '再有生成台', '最后沉淀内容资产'],
      callToAction: '让内容生产从随机发挥变成稳定系统。',
    },
    content:
      '# AI 编程初学者如何搭建自己的内容工作台\n\n很多人会用 AI，但还不会用 AI 稳定做内容。\n\n先把流程拆清楚，再逐步自动化，才是更适合初学者的方式。',
    variants: [
      {
        id: 'variant-wechat-1',
        platform: 'wechat',
        title: 'AI 编程初学者如何搭建自己的内容工作台：一套能长期复用的流程',
        content: '公众号长文版本示例。',
      },
      {
        id: 'variant-xhs-1',
        platform: 'xhs',
        title: '做内容别再乱写了｜AI 内容工作台这样搭',
        content: '小红书版本示例。',
      },
      {
        id: 'variant-zhihu-1',
        platform: 'zhihu',
        title: '如何为 AI 编程初学者搭建内容工作台？',
        content: '知乎版本示例。',
      },
    ],
    createdAt: '2026-03-12T11:00:00.000Z',
  },
];

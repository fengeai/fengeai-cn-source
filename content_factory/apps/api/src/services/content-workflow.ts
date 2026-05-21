import type {
  Article,
  ArticleVariant,
  ContentBrief,
  Platform,
  Topic,
} from '@content-assistant/shared';
import { generateDraftWithProvider, generateReferenceInsights } from './llm-provider.js';
import { readReferenceMaterials } from './reference-reader.js';

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildBrief(topic: Topic): ContentBrief {
  return {
    hook: `关于"${topic.title}"，一个很多人没想透的问题`,
    promise: `这篇不讲概念，只讲${topic.title}到底是什么、能帮你解决什么事、具体怎么上手。`,
    keyPoints: [
      `先讲清楚 ${topic.title} 到底解决什么问题`,
      `再拆成 ${topic.audience} 能直接照做的步骤`,
      '最后帮你把这条路固定下来，下次不用从头想',
    ],
    callToAction: '今天先选一个小场景，把方法用起来。',
  };
}

export function buildOutline(topic: Topic, brief: ContentBrief): string[] {
  return [
    `痛点：${brief.hook}`,
    `真相：大多数人卡在哪里`,
    `做法：${topic.angle}`,
    `步骤：${topic.keywords.join('、')} 的具体操作`,
    `收尾：${brief.callToAction}`,
  ];
}

export function buildVariants(topic: Topic, draft: string): ArticleVariant[] {
  return [
    buildVariant('wechat', topic, draft),
    buildVariant('xhs', topic, draft),
    buildVariant('zhihu', topic, draft),
  ];
}

function buildVariant(platform: Platform, topic: Topic, draft: string): ArticleVariant {
  const platformTitleMap: Record<Platform, string> = {
    wechat: `${topic.title}：先跑通，再完美`,
    xhs: `${topic.title}｜别再瞎折腾了`,
    zhihu: `关于"${topic.title}"，一个被忽略的真相`,
  };

  return {
    id: createId(`variant-${platform}`),
    platform,
    title: platformTitleMap[platform],
    content: draft,
  };
}

export async function generateInsightsForTopic(topic: Topic): Promise<string> {
  const referenceMaterials = await readReferenceMaterials(topic.summary);
  return referenceMaterials.length > 0
    ? await generateReferenceInsights({
      topicTitle: topic.title,
      audience: topic.audience,
      angle: topic.angle,
      references: referenceMaterials,
    })
    : '';
}

export async function createArticle(
  topic: Topic,
  options: { referenceInsights?: string } = {},
): Promise<Article> {
  const brief = buildBrief(topic);
  const outline = buildOutline(topic, brief);
  const referenceInsights = options.referenceInsights ?? await generateInsightsForTopic(topic);
  const generatedDraft = await generateDraftWithProvider(
    {
      topicTitle: topic.title,
      topicSummary: topic.summary,
      audience: topic.audience,
      angle: topic.angle,
      keywords: topic.keywords,
      outline,
      referenceInsights,
    },
  );
  const content = generatedDraft.content;
  const variants = buildVariants(topic, content);

  return {
    id: createId('article'),
    topicId: topic.id,
    title: generatedDraft.title,
    status: 'draft',
    outline,
    brief,
    content,
    referenceInsights,
    variants,
    createdAt: new Date().toISOString(),
  };
}

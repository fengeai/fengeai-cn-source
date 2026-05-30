import type { Article, ArticleVariant, ContentBrief } from '@content-assistant/shared';
import { prisma } from '../lib/prisma.js';

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[]): string {
  return value.join('\n');
}

function toBrief(record: {
  hook: string;
  promise: string;
  keyPointsText: string;
  callToAction: string;
}): ContentBrief {
  return {
    hook: record.hook,
    promise: record.promise,
    keyPoints: splitLines(record.keyPointsText),
    callToAction: record.callToAction,
  };
}

function toVariant(record: {
  id: string;
  platform: string;
  title: string;
  content: string;
}): ArticleVariant {
  return {
    id: record.id,
    platform: record.platform as ArticleVariant['platform'],
    title: record.title,
    content: record.content,
  };
}

function toArticle(record: {
  id: string;
  topicId: string;
  title: string;
  status: string;
  outlineText: string;
  hook: string;
  promise: string;
  keyPointsText: string;
  callToAction: string;
  content: string;
  referenceInsights: string | null;
  createdAt: Date;
  variants: Array<{
    id: string;
    platform: string;
    title: string;
    content: string;
  }>;
}): Article {
  return {
    id: record.id,
    topicId: record.topicId,
    title: record.title,
    status: record.status as Article['status'],
    outline: splitLines(record.outlineText),
    brief: toBrief(record),
    content: record.content,
    referenceInsights: record.referenceInsights ?? undefined,
    variants: record.variants.map(toVariant),
    createdAt: record.createdAt.toISOString(),
  };
}

export const articleRepository = {
  async list(): Promise<Article[]> {
    const records = await prisma.article.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(toArticle);
  },

  async getById(id: string): Promise<Article | null> {
    const record = await prisma.article.findUnique({
      where: { id },
      include: { variants: true },
    });

    return record ? toArticle(record) : null;
  },

  async create(input: {
    topicId: string;
    title: string;
    status: string;
    outline: string[];
    brief: ContentBrief;
    content: string;
    referenceInsights?: string;
    variants: ArticleVariant[];
  }): Promise<Article> {
    const record = await prisma.article.create({
      data: {
        topicId: input.topicId,
        title: input.title,
        status: input.status,
        outlineText: joinLines(input.outline),
        hook: input.brief.hook,
        promise: input.brief.promise,
        keyPointsText: joinLines(input.brief.keyPoints),
        callToAction: input.brief.callToAction,
        content: input.content,
        referenceInsights: input.referenceInsights,
        variants: {
          create: input.variants.map((variant) => ({
            platform: variant.platform,
            title: variant.title,
            content: variant.content,
          })),
        },
      },
      include: { variants: true },
    });

    return toArticle(record);
  },
};

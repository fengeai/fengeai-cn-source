import type { Topic } from '@content-assistant/shared';
import { prisma } from '../lib/prisma.js';

function parseKeywords(csv: string): string[] {
  return csv
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTopic(record: {
  id: string;
  title: string;
  summary: string;
  audience: string;
  angle: string;
  keywordsCsv: string;
  status: string;
  createdAt: Date;
}): Topic {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    audience: record.audience,
    angle: record.angle,
    keywords: parseKeywords(record.keywordsCsv),
    status: record.status as Topic['status'],
    createdAt: record.createdAt.toISOString(),
  };
}

export const topicRepository = {
  async list(): Promise<Topic[]> {
    const records = await prisma.topic.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map(toTopic);
  },

  async getById(id: string): Promise<Topic | null> {
    const record = await prisma.topic.findUnique({ where: { id } });
    return record ? toTopic(record) : null;
  },

  async create(input: Omit<Topic, 'id' | 'status' | 'createdAt'>): Promise<Topic> {
    const record = await prisma.topic.create({
      data: {
        title: input.title,
        summary: input.summary,
        audience: input.audience,
        angle: input.angle,
        keywordsCsv: input.keywords.join(','),
      },
    });

    return toTopic(record);
  },

  async markSelected(id: string): Promise<Topic | null> {
    const existing = await prisma.topic.findUnique({ where: { id } });
    if (!existing) return null;

    const record = await prisma.topic.update({
      where: { id },
      data: { status: 'selected' },
    });

    return toTopic(record);
  },

  async markInProgress(id: string): Promise<void> {
    await prisma.topic.update({
      where: { id },
      data: { status: 'in_progress' },
    });
  },
};

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { articleRepository } from '../repositories/article-repository.js';
import { topicRepository } from '../repositories/topic-repository.js';
import { requireAccessCode } from '../lib/access-code.js';
import { consumePublicUsage } from '../lib/usage-limit.js';
import { createArticle, generateInsightsForTopic } from '../services/content-workflow.js';
import { reviseReferenceInsights } from '../services/llm-provider.js';

const articleRequestSchema = z.object({
  topicId: z.string().min(1),
  referenceInsights: z.string().optional(),
});

const insightRevisionSchema = z.object({
  topicId: z.string().min(1),
  currentInsights: z.string().min(1),
  instruction: z.string().min(1),
});

export async function registerArticleRoutes(app: FastifyInstance) {
  app.get('/api/articles', async () => {
    const items = await articleRepository.list();
    return { items };
  });

  app.get('/api/articles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await articleRepository.getById(id);

    if (!article) {
      return reply.status(404).send({ message: 'Article not found' });
    }

    return article;
  });

  app.post('/api/articles/generate', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const parsed = articleRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid article payload',
        issues: parsed.error.flatten(),
      });
    }

    const topic = await topicRepository.getById(parsed.data.topicId);

    if (!topic) {
      return reply.status(404).send({ message: 'Topic not found' });
    }

    if (!consumePublicUsage(request, reply)) {
      return reply;
    }

    await topicRepository.markInProgress(topic.id);

    let draft;
    try {
      draft = await createArticle(topic, {
        referenceInsights: parsed.data.referenceInsights,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。';
      return reply
        .status(502)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ message, error: message });
    }

    const article = await articleRepository.create({
      topicId: draft.topicId,
      title: draft.title,
      status: draft.status,
      outline: draft.outline,
      brief: draft.brief,
      content: draft.content,
      referenceInsights: draft.referenceInsights,
      variants: draft.variants,
    });

    return reply.status(201).send(article);
  });

  app.post('/api/articles/insights', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const parsed = articleRequestSchema.pick({ topicId: true }).safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid insight payload',
        issues: parsed.error.flatten(),
      });
    }

    const topic = await topicRepository.getById(parsed.data.topicId);

    if (!topic) {
      return reply.status(404).send({ message: 'Topic not found' });
    }

    if (!consumePublicUsage(request, reply)) {
      return reply;
    }

    try {
      const referenceInsights = await generateInsightsForTopic(topic);
      return reply.send({
        topicId: topic.id,
        referenceInsights,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '观点提炼失败，请稍后重试。';
      return reply
        .status(502)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ message, error: message });
    }
  });

  app.post('/api/articles/insights/revise', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const parsed = insightRevisionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid insight revision payload',
        issues: parsed.error.flatten(),
      });
    }

    const topic = await topicRepository.getById(parsed.data.topicId);

    if (!topic) {
      return reply.status(404).send({ message: 'Topic not found' });
    }

    if (!consumePublicUsage(request, reply)) {
      return reply;
    }

    try {
      const referenceInsights = await reviseReferenceInsights({
        topicTitle: topic.title,
        audience: topic.audience,
        angle: topic.angle,
        currentInsights: parsed.data.currentInsights,
        instruction: parsed.data.instruction,
      });

      return reply.send({ referenceInsights });
    } catch (error) {
      const message = error instanceof Error ? error.message : '观点修改失败，请稍后重试。';
      return reply
        .status(502)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ message, error: message });
    }
  });
}

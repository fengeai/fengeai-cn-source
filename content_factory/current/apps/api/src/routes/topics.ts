import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAccessCode } from '../lib/access-code.js';
import { topicRepository } from '../repositories/topic-repository.js';

const topicSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  audience: z.string().min(2),
  angle: z.string().min(2),
  keywords: z.array(z.string()).min(1),
});

export async function registerTopicRoutes(app: FastifyInstance) {
  app.get('/api/topics', async () => {
    const items = await topicRepository.list();
    return { items };
  });

  app.get('/api/topics/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const topic = await topicRepository.getById(id);

    if (!topic) {
      return reply.status(404).send({ message: 'Topic not found' });
    }

    return topic;
  });

  app.post('/api/topics', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const parsed = topicSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid topic payload',
        issues: parsed.error.flatten(),
      });
    }

    const topic = await topicRepository.create(parsed.data);

    return reply.status(201).send(topic);
  });

  app.post('/api/topics/:id/select', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const { id } = request.params as { id: string };
    const topic = await topicRepository.markSelected(id);

    if (!topic) {
      return reply.status(404).send({ message: 'Topic not found' });
    }

    return topic;
  });
}

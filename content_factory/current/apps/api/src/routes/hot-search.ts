import type { FastifyInstance } from 'fastify';
import { requireAccessCode } from '../lib/access-code.js';
import { searchHotTopics } from '../services/hot-search.js';

export async function registerHotSearchRoutes(app: FastifyInstance) {
  app.get('/api/hot-search', async (request, reply) => {
    if (!requireAccessCode(request, reply)) {
      return reply;
    }

    const { keyword } = request.query as { keyword?: string };
    const normalizedKeyword = keyword?.trim() || '';

    if (!normalizedKeyword) {
      return reply.status(400).send({ message: '请输入方向。' });
    }

    const results = await searchHotTopics(normalizedKeyword);

    return {
      keyword: normalizedKeyword,
      results,
    };
  });
}

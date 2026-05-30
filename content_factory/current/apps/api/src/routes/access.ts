import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAccessControlEnabled, isValidAccessCode } from '../lib/access-code.js';

const accessSchema = z.object({
  code: z.string().min(1),
});

export async function registerAccessRoutes(app: FastifyInstance) {
  app.get('/api/access/status', async () => {
    return {
      enabled: isAccessControlEnabled(),
    };
  });

  app.post('/api/access/verify', async (request, reply) => {
    const parsed = accessSchema.safeParse(request.body);

    if (!parsed.success || !isValidAccessCode(parsed.data.code)) {
      return reply.status(401).send({
        message: '访问码不正确，请添加枫哥微信获取访问码。',
        error: 'INVALID_ACCESS_CODE',
      });
    }

    return {
      ok: true,
    };
  });
}

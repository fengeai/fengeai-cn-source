import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { registerArticleRoutes } from './routes/articles.js';
import { registerHotSearchRoutes } from './routes/hot-search.js';
import { registerTopicRoutes } from './routes/topics.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: [env.webUrl, 'http://127.0.0.1:3002', 'http://localhost:3002'],
});

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'content-assistant-api',
    timestamp: new Date().toISOString(),
  };
});

await registerTopicRoutes(app);
await registerArticleRoutes(app);
await registerHotSearchRoutes(app);

const port = env.port;

app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3020);
const DIST_DIR = path.join(__dirname, 'dist');
const TEST_TOKEN = process.env.ASSISTANT_TEST_TOKEN || '';
const API_KEY = process.env.ASSISTANT_API_KEY || '';
const BASE_URL = (process.env.ASSISTANT_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.ASSISTANT_MODEL || 'gpt-4o-mini';
const PUBLIC_ACCESS = process.env.ASSISTANT_PUBLIC_ACCESS === 'true';
const RATE_LIMIT_PER_MINUTE = Number(process.env.ASSISTANT_RATE_LIMIT_PER_MINUTE || 6);
const RATE_LIMIT_PER_DAY = Number(process.env.ASSISTANT_RATE_LIMIT_PER_DAY || 80);
const MAX_OUTPUT_TOKENS = Number(process.env.ASSISTANT_MAX_OUTPUT_TOKENS || 8192);
const MAX_REQUEST_BODY_BYTES = Number(process.env.ASSISTANT_MAX_REQUEST_BODY_BYTES || 15 * 1024 * 1024);
const rateStore = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function writeSse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  const current = rateStore.get(ip) || {
    minuteStart: now,
    minuteCount: 0,
    day,
    dayCount: 0
  };

  if (now - current.minuteStart >= 60 * 1000) {
    current.minuteStart = now;
    current.minuteCount = 0;
  }
  if (current.day !== day) {
    current.day = day;
    current.dayCount = 0;
  }

  current.minuteCount += 1;
  current.dayCount += 1;
  rateStore.set(ip, current);

  if (current.minuteCount > RATE_LIMIT_PER_MINUTE) {
    return {
      limited: true,
      status: 429,
      message: `当前体验人数较多，你这边操作有点快。请约 ${Math.ceil((60 * 1000 - (now - current.minuteStart)) / 1000)} 秒后再试。`
    };
  }

  if (current.dayCount > RATE_LIMIT_PER_DAY) {
    return {
      limited: true,
      status: 429,
      message: '今天的免费体验次数已经用完，明天再来继续试。'
    };
  }

  return { limited: false };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_REQUEST_BODY_BYTES) {
        reject(new Error('请求内容过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleChat(req, res) {
  const rateLimit = checkRateLimit(req);
  if (rateLimit.limited) {
    sendJson(res, rateLimit.status, { error: rateLimit.message });
    return;
  }

  const token = req.headers['x-assistant-test-token'];
  if (!PUBLIC_ACCESS && (!TEST_TOKEN || token !== TEST_TOKEN)) {
    sendJson(res, 403, { error: '测试授权码无效。' });
    return;
  }

  if (!API_KEY) {
    sendJson(res, 503, { error: '站长测试模型尚未启用。' });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const modelMessages = messages.map(message => {
      if (Array.isArray(message.images) && message.images.length > 0) {
        return {
          role: message.role,
          content: [
            { type: 'text', text: message.content || '请分析这张图片' },
            ...message.images.map(image => ({
              type: 'image_url',
              image_url: { url: image }
            }))
          ]
        };
      }
      return { role: message.role, content: message.content };
    });

    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: modelMessages,
        temperature: 0.7,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true
      })
    });

    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      sendJson(res, upstream.status, { error: data.error?.message || data.message || '模型服务请求失败。' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });

    const reader = upstream.body?.getReader();
    if (!reader) {
      writeSse(res, { error: '模型服务没有返回数据流。' });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) writeSse(res, { content });
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : '服务器错误。' });
      return;
    }
    writeSse(res, { error: error instanceof Error ? error.message : '服务器错误。' });
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/assistant') {
    res.writeHead(301, { Location: '/assistant/' });
    res.end();
    return;
  }

  if (!pathname.startsWith('/assistant/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  pathname = pathname.replace(/^\/assistant\/?/, '');
  const requestedPath = path.normalize(path.join(DIST_DIR, pathname));
  const safePath = requestedPath.startsWith(DIST_DIR) ? requestedPath : path.join(DIST_DIR, 'index.html');
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : path.join(DIST_DIR, 'index.html');
  const ext = path.extname(filePath);

  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/assistant/api/chat') {
    handleChat(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Fenge assistant server running on ${PORT}`);
});

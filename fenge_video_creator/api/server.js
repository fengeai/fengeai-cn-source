import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';
import { createVideoProvider } from '../providers/index.js';
import { createVideoPlan, getPlannerStatus } from '../services/planService.js';
import { createStore } from '../storage/memoryStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT_DIR, '.env'));

const WEB_DIR = path.join(ROOT_DIR, 'web');
const UPLOAD_DIR = path.join(ROOT_DIR, 'storage', 'uploads');
const DATA_FILE = path.join(ROOT_DIR, 'storage', 'data', 'store.json');
const PORT = Number(process.env.PORT || 3030);
const PUBLIC_BASE_URL = (process.env.VIDEO_PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const MAX_JSON_BYTES = Number(process.env.VIDEO_MAX_JSON_BYTES || 1024 * 1024);
const MAX_UPLOAD_BYTES = Number(process.env.VIDEO_MAX_UPLOAD_BYTES || 8 * 1024 * 1024);

const store = createStore({ dataFile: DATA_FILE });
const videoProvider = createVideoProvider({ publicBaseUrl: PUBLIC_BASE_URL });

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readJson(req, maxBytes = MAX_JSON_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error('请求内容过大'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('请求 JSON 格式不正确'));
      }
    });
    req.on('error', reject);
  });
}

function getUserId(req, body = {}) {
  return String(req.headers['x-video-user-id'] || body.userId || '').trim();
}

function requireUserId(req, res, body = {}) {
  const userId = getUserId(req, body);
  if (!userId) {
    sendJson(res, 401, { error: '缺少用户标识，请刷新页面后重试。' });
    return '';
  }
  return userId;
}

function createUploadName(fileName, mimeType) {
  const extByMime = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp'
  };
  const originalExt = path.extname(String(fileName || '')).toLowerCase();
  const ext = extByMime[mimeType] || (['.png', '.jpg', '.jpeg', '.webp'].includes(originalExt) ? originalExt : '');
  if (!ext) {
    throw new Error('只支持 PNG、JPG、WEBP 图片。');
  }
  return `ref_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
}

function decodeImageUpload(body) {
  const dataUrl = String(body.dataUrl || '');
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error('图片格式不正确，请上传 PNG、JPG 或 WEBP。');
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(`图片不能超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB。`);
  }

  return {
    mimeType,
    buffer,
    fileName: createUploadName(body.fileName, mimeType)
  };
}

function buildSegmentPrompt(plan, segment) {
  return [
    `标题：${plan.title}`,
    `这是整条短视频的第 ${segment.order} 个分镜，请只生成这一段。`,
    '画面稳定、主体清晰、字幕友好、不要文字乱码。',
    '如果提供了参考形象，请保持人物五官、发型、服装和整体气质一致。',
    '',
    '本段口播：',
    segment.narration,
    '',
    '本段画面：',
    segment.visualPrompt
  ].join('\n');
}

async function proxyVideo(res, req, videoUrl) {
  if (!videoUrl) {
    sendJson(res, 404, { error: '视频还没有生成。' });
    return;
  }

  const upstream = await fetch(videoUrl, {
    headers: {
      ...(req.headers.range ? { Range: req.headers.range } : {})
    }
  });
  if (!upstream.ok && upstream.status !== 206) {
    sendJson(res, upstream.status, { error: '视频资源暂时无法访问。' });
    return;
  }

  const headers = {
    'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
    'Content-Disposition': 'inline',
    'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes'
  };
  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');
  if (contentLength) headers['Content-Length'] = contentLength;
  if (contentRange) headers['Content-Range'] = contentRange;

  res.writeHead(upstream.status, headers);
  Readable.fromWeb(upstream.body).pipe(res);
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/video/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'fenge_video_creator',
      provider: process.env.VIDEO_PROVIDER || 'mock',
      model: process.env.VIDEO_MODEL || 'mock'
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/video/api/provider/health') {
    if (typeof videoProvider.checkConnection !== 'function') {
      sendJson(res, 200, { ok: true, provider: process.env.VIDEO_PROVIDER || 'mock' });
      return;
    }
    const result = await videoProvider.checkConnection();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/video/api/planner/health') {
    sendJson(res, 200, getPlannerStatus());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/video/api/uploads') {
    const body = await readJson(req, MAX_UPLOAD_BYTES * 2);
    const userId = requireUserId(req, res, body);
    if (!userId) return;
    const upload = decodeImageUpload(body);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, upload.fileName), upload.buffer);
    const asset = store.createAsset({
      userId,
      url: `${PUBLIC_BASE_URL}/video/uploads/${upload.fileName}`,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.buffer.length
    });
    sendJson(res, 201, {
      asset,
      url: asset.url,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.buffer.length
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/video/api/projects') {
    const userId = requireUserId(req, res);
    if (!userId) return;
    sendJson(res, 200, { projects: store.listProjects(userId) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/video/api/projects') {
    const body = await readJson(req);
    const userId = requireUserId(req, res, body);
    if (!userId) return;
    const sourceType = body.sourceType || 'topic';
    const sourceContent = String(body.sourceContent || '').trim();
    const assets = Array.isArray(body.assets) ? body.assets : [];

    if (!sourceContent) {
      sendJson(res, 400, { error: '请输入主题、文章或正文。' });
      return;
    }

    const project = store.createProject({ userId, sourceType, sourceContent, assets });
    sendJson(res, 201, { project });
    return;
  }

  const projectMatch = url.pathname.match(/^\/video\/api\/projects\/([^/]+)$/);
  if (req.method === 'GET' && projectMatch) {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const project = store.getProjectContext(projectMatch[1], userId);
    if (!project) {
      sendJson(res, 404, { error: '项目不存在。' });
      return;
    }
    sendJson(res, 200, { project });
    return;
  }

  const planMatch = url.pathname.match(/^\/video\/api\/projects\/([^/]+)\/plan$/);
  if (req.method === 'POST' && planMatch) {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const project = store.getProject(planMatch[1], userId);
    if (!project) {
      sendJson(res, 404, { error: '项目不存在。' });
      return;
    }

    const plan = store.savePlan(project.id, await createVideoPlan(project));
    sendJson(res, 201, { plan });
    return;
  }

  const savePlanMatch = url.pathname.match(/^\/video\/api\/projects\/([^/]+)\/plan$/);
  if (req.method === 'PUT' && savePlanMatch) {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const project = store.getProject(savePlanMatch[1], userId);
    if (!project) {
      sendJson(res, 404, { error: '项目不存在。' });
      return;
    }

    const body = await readJson(req);
    const plan = store.savePlan(project.id, body);
    sendJson(res, 200, { plan });
    return;
  }

  const jobMatch = url.pathname.match(/^\/video\/api\/projects\/([^/]+)\/jobs$/);
  if (req.method === 'POST' && jobMatch) {
    const body = await readJson(req);
    const userId = requireUserId(req, res, body);
    if (!userId) return;
    const project = store.getProject(jobMatch[1], userId);
    const plan = store.getPlan(jobMatch[1]);
    if (!project || !plan) {
      sendJson(res, 404, { error: '请先创建项目并生成视频方案。' });
      return;
    }

    const segments = [];
    for (const segment of plan.storyboard) {
      const durationSec = Number(segment.durationSec || body.durationSec || 5);
      const providerJob = await videoProvider.createVideo({
        prompt: buildSegmentPrompt(plan, segment),
        aspectRatio: plan.aspectRatio,
        durationSec: Math.min(Math.max(durationSec, 2), 15),
        qualityMode: body.qualityMode || 'draft',
        resolution: body.resolution || process.env.VIDEO_RESOLUTION || '480p',
        referenceImageUrl: String(body.referenceImageUrl || '').trim(),
        referenceRole: body.referenceRole || 'reference_image',
        subjectType: body.usePersonReference ? 'person' : '',
        generateAudio: body.generateAudio === true
      });
      segments.push({
        id: `segment_${segment.order}`,
        order: segment.order,
        narration: segment.narration,
        visualPrompt: segment.visualPrompt,
        durationSec,
        providerJobId: providerJob.providerJobId,
        status: 'queued',
        currentStep: '排队中',
        videoUrl: '',
        errorMessage: ''
      });
    }

    const settings = {
      qualityMode: body.qualityMode || 'draft',
      resolution: body.resolution || process.env.VIDEO_RESOLUTION || '480p',
      durationSec: Number(body.durationSec || 5),
      referenceImageUrl: String(body.referenceImageUrl || '').trim(),
      usePersonReference: body.usePersonReference === true,
      generateAudio: body.generateAudio === true
    };
    const job = store.createJob({ projectId: project.id, userId, settings, segments });
    sendJson(res, 201, { job });
    return;
  }

  const getJobMatch = url.pathname.match(/^\/video\/api\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && getJobMatch) {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const job = store.getJob(getJobMatch[1], userId);
    if (!job) {
      sendJson(res, 404, { error: '任务不存在。' });
      return;
    }

    const segments = [];
    for (const segment of job.segments || []) {
      const providerStatus = await videoProvider.getVideo(segment.providerJobId);
      segments.push({
        ...segment,
        status: providerStatus.status,
        currentStep: providerStatus.currentStep,
        videoUrl: providerStatus.videoUrl || segment.videoUrl,
        errorMessage: providerStatus.error || ''
      });
    }

    const failed = segments.find(segment => segment.status === 'failed');
    const finishedCount = segments.filter(segment => segment.status === 'succeeded').length;
    const allFinished = segments.length > 0 && finishedCount === segments.length;
    const updatedJob = store.updateJob(job.id, {
      segments,
      status: failed ? 'failed' : allFinished ? 'succeeded' : 'running',
      currentStep: failed
        ? `第 ${failed.order} 段生成失败`
        : allFinished
          ? `全部 ${segments.length} 段已完成`
          : `已完成 ${finishedCount}/${segments.length} 段`,
      videoUrl: allFinished ? segments[0].videoUrl : '',
      errorMessage: failed?.errorMessage || ''
    });
    sendJson(res, 200, { job: updatedJob });
    return;
  }

  const mediaMatch = url.pathname.match(/^\/video\/api\/jobs\/([^/]+)\/segments\/([^/]+)\/media$/);
  if (req.method === 'GET' && mediaMatch) {
    const job = store.getJob(mediaMatch[1]);
    const segment = job?.segments?.find(item => item.id === mediaMatch[2]);
    if (!job || !segment) {
      sendJson(res, 404, { error: '视频片段不存在。' });
      return;
    }
    await proxyVideo(res, req, segment.videoUrl);
    return;
  }

  sendJson(res, 404, { error: '接口不存在。' });
}

function serveStatic(req, res, url) {
  if (url.pathname === '/video') {
    res.writeHead(301, { Location: '/video/' });
    res.end();
    return;
  }

  if (!url.pathname.startsWith('/video/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const isUpload = url.pathname.startsWith('/video/uploads/');
  const baseDir = isUpload ? UPLOAD_DIR : WEB_DIR;
  const requested = isUpload
    ? url.pathname.replace(/^\/video\/uploads\/?/, '')
    : url.pathname.replace(/^\/video\/?/, '') || 'index.html';
  const requestedPath = path.normalize(path.join(baseDir, requested));
  const safePath = requestedPath.startsWith(baseDir) ? requestedPath : path.join(WEB_DIR, 'index.html');
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : isUpload ? '' : path.join(WEB_DIR, 'index.html');

  if (!filePath) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    ...(ext === '.mp4' ? { 'Content-Disposition': 'inline' } : {})
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname.startsWith('/video/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : '服务器错误。' });
  }
});

server.listen(PORT, () => {
  console.log(`Fenge video creator running on ${PORT}`);
});

const express = require('express');
const multer = require('multer');
const admZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

// 辅助函数：转换文件内容为 UTF-8 并修复 Meta 标签
async function processHtmlFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const detection = jschardet.detect(buffer);
    let content = '';
    let encoding = detection.encoding ? detection.encoding.toLowerCase() : 'utf-8';

    console.log(`Detected encoding for ${filePath}: ${encoding} (confidence: ${detection.confidence})`);

    // 如果是 GBK/GB2312 等非 UTF-8 编码，进行转换
    if (encoding !== 'utf-8' && encoding !== 'ascii' && detection.confidence > 0.8) {
        if (encoding === 'gb2312') encoding = 'gbk';
        try {
            content = iconv.decode(buffer, encoding);
        } catch (e) {
            console.warn('Decode failed, falling back to utf-8 string', e);
            content = buffer.toString('utf-8');
        }
    } else {
        content = buffer.toString('utf-8');
    }

    // 修复 Meta Charset
    // 1. 移除已有的 charset 定义 (防止冲突)
    content = content.replace(/<meta[^>]*charset=["']?([^"'>]*)["']?[^>]*>/gi, '');
    content = content.replace(/<meta[^>]*http-equiv=["']?Content-Type["']?[^>]*>/gi, '');

    // 2. 在 <head> 后插入标准的 UTF-8 meta
    const metaTag = '<meta charset="UTF-8">';
    if (content.match(/<head>/i)) {
        content = content.replace(/<head>/i, `<head>\n    ${metaTag}`);
    } else if (content.match(/<html>/i)) {
        content = content.replace(/<html>/i, `<html>\n<head>${metaTag}</head>`);
    } else {
        content = metaTag + '\n' + content;
    }

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Processed ${filePath}: Converted to UTF-8 and updated meta tags.`);
  } catch (err) {
    console.error('Error processing HTML file:', err);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  throw new Error('ACCESS_TOKEN is required');
} // 简单的鉴权 Token

app.set('trust proxy', true);

// 允许跨域
app.use(cors());
app.use(express.json()); // 解析 JSON body
app.use(express.urlencoded({ extended: true })); // 解析 URL-encoded body
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  },
})); // 托管前端页面
app.use('/works', express.static(path.join(__dirname, 'data/student_works'))); // 托管作品目录，使其可直接访问

// 兼容 /upload 路径，直接返回学员作品上传/展示页
app.get(['/upload', '/upload/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/upload.html'));
});

// 独立图片编辑工具页
app.get(['/image-editor', '/image-editor/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/image-editor.html'));
});

app.get(['/visits', '/visits/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public/visits.html'));
});

// 配置上传存储
const upload = multer({
  dest: 'temp_uploads/', // 临时目录
  limits: { fileSize: 50 * 1024 * 1024 }, // 限制 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip' && ext !== '.html' && ext !== '.htm') {
      return cb(new Error('Only .zip or .html files are allowed!'));
    }
    cb(null, true);
  }
});

// 初始化 DB
const DB_FILE = path.join(__dirname, 'data', 'projects.json');
fs.ensureFileSync(DB_FILE);
if (!fs.existsSync(DB_FILE) || fs.readFileSync(DB_FILE).length === 0) {
  fs.writeJsonSync(DB_FILE, []);
}

const VISITS_FILE = path.join(__dirname, 'data', 'visits.jsonl');
fs.ensureFileSync(VISITS_FILE);

function cleanText(value, maxLength = 240) {
  return String(value || '')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getClientIp(req) {
  return cleanText(req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket.remoteAddress || 'unknown', 80);
}

function getVisitorId(req) {
  const raw = cleanText(req.body?.visitorId, 80);
  return /^[a-zA-Z0-9_-]{8,80}$/.test(raw) ? raw : '';
}

function readVisitEvents(days = 7) {
  const since = Date.now() - Math.max(1, Math.min(days, 90)) * 24 * 60 * 60 * 1000;
  const content = fs.readFileSync(VISITS_FILE, 'utf8');

  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((event) => event && new Date(event.at).getTime() >= since);
}

function summarizeVisits(events) {
  const visitors = new Set();
  const ips = new Set();
  const byDay = {};
  const byPath = {};

  for (const event of events) {
    const day = String(event.at || '').slice(0, 10);
    const visitorKey = event.visitorId || event.ip;
    if (visitorKey) visitors.add(visitorKey);
    if (event.ip) ips.add(event.ip);

    byDay[day] = byDay[day] || { date: day, views: 0, visitors: new Set() };
    byDay[day].views += 1;
    if (visitorKey) byDay[day].visitors.add(visitorKey);

    const page = event.path || '/';
    byPath[page] = byPath[page] || { path: page, views: 0, visitors: new Set() };
    byPath[page].views += 1;
    if (visitorKey) byPath[page].visitors.add(visitorKey);
  }

  return {
    pageviews: events.length,
    uniqueVisitors: visitors.size,
    uniqueIps: ips.size,
    byDay: Object.values(byDay)
      .map((item) => ({ date: item.date, views: item.views, visitors: item.visitors.size }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topPages: Object.values(byPath)
      .map((item) => ({ path: item.path, views: item.views, visitors: item.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
    recent: events.slice(-50).reverse(),
  };
}

app.post('/api/track', async (req, res) => {
  const event = {
    at: new Date().toISOString(),
    visitorId: getVisitorId(req),
    ip: getClientIp(req),
    method: req.method,
    path: cleanText(req.body?.path || req.headers.referer || '/', 300),
    title: cleanText(req.body?.title, 160),
    referrer: cleanText(req.body?.referrer, 300),
    userAgent: cleanText(req.headers['user-agent'], 300),
  };

  try {
    await fs.appendFile(VISITS_FILE, JSON.stringify(event) + '\n', 'utf8');
    res.status(204).end();
  } catch (err) {
    console.error('Track visit failed:', err);
    res.status(500).json({ error: 'Track visit failed' });
  }
});

app.get('/api/visits/summary', (req, res) => {
  if (req.query.token !== ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Invalid Access Token' });
  }

  const days = Number(req.query.days || 7);
  const events = readVisitEvents(days);
  res.json({
    days: Math.max(1, Math.min(days, 90)),
    generatedAt: new Date().toISOString(),
    ...summarizeVisits(events),
  });
});

// 获取项目列表
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await fs.readJson(DB_FILE);
    // 按时间倒序
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(projects);
  } catch (err) {
    res.json([]);
  }
});

// 上传接口
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { projectName, token, description, author } = req.body;

  // 1. 基础校验
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (token !== ACCESS_TOKEN) {
    await fs.remove(file.path); // 删除临时文件
    return res.status(403).json({ error: 'Invalid Access Token' });
  }
  if (!projectName || !/^[a-zA-Z0-9-_]+$/.test(projectName)) {
    await fs.remove(file.path);
    return res.status(400).json({ error: 'Invalid project name. Use alphanumeric, hyphens, or underscores only.' });
  }

  const targetDir = path.join(__dirname, 'data/student_works', projectName);
  const ext = path.extname(file.originalname).toLowerCase();

  try {
    // 2. 检查目录是否存在，存在则覆盖
    await fs.ensureDir(targetDir);
    await fs.emptyDir(targetDir); // 清空旧文件

    // 3. 处理文件
    if (ext === '.zip') {
        const zip = new admZip(file.path);
        zip.extractAllTo(targetDir, true);
    } else if (ext === '.html' || ext === '.htm') {
        // 如果是单文件 HTML，直接移动并重命名为 index.html
        const destPath = path.join(targetDir, 'index.html');
        await fs.move(file.path, destPath);
        // 处理编码问题
        await processHtmlFile(destPath);
    }

    // 新增：ZIP 解压后的后处理逻辑
    if (ext === '.zip') {
        // 1. 智能解套：如果解压后只有一个文件夹，且该文件夹里有 index.html，则将其内容移动到根目录
        const items = await fs.readdir(targetDir);
        // 过滤掉系统文件（如 __MACOSX, .DS_Store）
        const validItems = items.filter(item => !item.startsWith('.') && item !== '__MACOSX');
        
        if (validItems.length === 1) {
            const subDirPath = path.join(targetDir, validItems[0]);
            const stat = await fs.stat(subDirPath);
            if (stat.isDirectory()) {
                console.log(`Detected nested folder: ${validItems[0]}, moving content to root...`);
                // 移动子目录内容到临时目录，再移回根目录，避免冲突
                const tempMoveDir = path.join(__dirname, 'temp_move_' + projectName);
                await fs.move(subDirPath, tempMoveDir);
                await fs.remove(subDirPath); // 删除空目录
                await fs.copy(tempMoveDir, targetDir);
                await fs.remove(tempMoveDir);
            }
        }

        // 2. 批量转码：遍历目录寻找所有 .html 文件进行处理
        async function processDirectory(dir) {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    await processDirectory(fullPath);
                } else if (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')) {
                    await processHtmlFile(fullPath);
                }
            }
        }
        await processDirectory(targetDir);
    }

    // 4. 清理临时文件
    if (await fs.pathExists(file.path)) {
        await fs.remove(file.path);
    }

    // 5. 更新 DB
    const projects = await fs.readJson(DB_FILE);
    // 修改：如果是在本地环境 (localhost)，URL 需要指向本地的 static 目录
    // 但为了保持一致性，我们统一用 /works/ 前缀，然后让 Express 托管这个目录
    const projectUrl = `/works/${projectName}/`;
    
    // 移除旧记录（如果存在）
    const newProjects = projects.filter(p => p.id !== projectName);
    
    newProjects.push({
        id: projectName,
        name: projectName,
        url: projectUrl,
        author: author || '匿名战友',
        description: description || '暂无介绍',
        createdAt: new Date().toISOString(),
        type: ext === '.zip' ? 'project' : 'single_page'
    });

    await fs.writeJson(DB_FILE, newProjects);

    // 6. 返回成功
    res.json({
      success: true,
      message: 'Deploy successful!',
      url: projectUrl
    });

  } catch (err) {
    console.error(err);
    if (file) await fs.remove(file.path).catch(() => {});
    res.status(500).json({ error: 'Deployment failed: ' + err.message });
  }
});

// 删除接口
app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { token } = req.body; // 简单起见，通过 body 传 token，或者 query

    if (!token || token !== ACCESS_TOKEN) {
        return res.status(403).json({ error: 'Invalid Access Token' });
    }

    try {
        const projects = await fs.readJson(DB_FILE);
        const projectIndex = projects.findIndex(p => p.id === id);

        if (projectIndex === -1) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projects[projectIndex];
        const projectDir = path.join(__dirname, 'data/student_works', project.id);

        // 删除文件目录
        await fs.remove(projectDir);

        // 从 DB 移除
        projects.splice(projectIndex, 1);
        await fs.writeJson(DB_FILE, projects);

        res.json({ success: true, message: 'Project deleted successfully' });

    } catch (err) {
        console.error('Delete failed:', err);
        res.status(500).json({ error: 'Delete failed: ' + err.message });
    }
});

// 健康检查
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Upload service running on port ${PORT}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3010);
const PUBLIC_DIR = path.join(__dirname, 'public');
const BASE_PATH = '/wechat';

const themes = {
  fenge: palette('枫哥爆文排版模板', '#1267ff', '#edf5ff', '#bfdbfe', '#0f172a', '#64748b', '#fff8e6'),
  clean: palette('清爽阅读模板', '#2563eb', '#eff6ff', '#bfdbfe', '#111827', '#64748b', '#f8fafc'),
  tech: palette('科技实战模板', '#4f46e5', '#eef2ff', '#c7d2fe', '#111827', '#6b7280', '#f5f3ff'),
  warm: palette('温暖成长模板', '#c2410c', '#fff7ed', '#fed7aa', '#1f2937', '#78716c', '#fffbeb'),
  magazine: palette('杂志深读模板', '#111827', '#f3f4f6', '#d1d5db', '#111827', '#6b7280', '#f9fafb'),
  business: palette('商业洞察模板', '#0f766e', '#ecfdf5', '#99f6e4', '#0f172a', '#64748b', '#f0fdfa'),
  course: palette('课程交付模板', '#7c3aed', '#f5f3ff', '#ddd6fe', '#1e1b4b', '#6b7280', '#faf5ff'),
  minimal: palette('极简留白模板', '#334155', '#f8fafc', '#e2e8f0', '#0f172a', '#64748b', '#ffffff')
};

function palette(name, accent, accentSoft, border, ink, muted, quoteBg) {
  return { name, accent, accentSoft, border, ink, muted, quoteBg, gold: '#b7791f' };
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;border-radius:4px;padding:1px 5px;font-size:90%;color:#be123c;">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:none;">$1</a>');
  return html;
}

function extractTitle(markdown) {
  const lines = markdown.split(/\r?\n/).map(line => line.trim());
  const heading = lines.find(line => /^#\s+/.test(line));
  if (heading) return heading.replace(/^#\s+/, '').trim();
  const firstText = lines.find(line => line && !line.startsWith('>') && !line.startsWith('```'));
  return firstText ? firstText.replace(/^#+\s*/, '').slice(0, 60) : '未命名文章';
}

function stripMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`>#|-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function splitParagraphs(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map(item => stripMarkdown(item.replace(/\n/g, ' ')))
    .filter(Boolean);
}

function pickGoldenSentences(paragraphs) {
  const keywords = ['真正', '关键', '本质', '不是', '而是', '一定', '记住', '高手', '普通人', '行动', '闭环', '结果', '核心'];
  const scored = paragraphs
    .flatMap(p => p.split(/[。！？!?]/).map(s => s.trim()).filter(Boolean))
    .filter(s => s.length >= 12 && s.length <= 90)
    .map(sentence => ({
      sentence,
      score: keywords.reduce((sum, word) => sum + (sentence.includes(word) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length);
  return [...new Set(scored.map(item => item.sentence))].slice(0, 5);
}

function pickImportantParagraphs(paragraphs) {
  const keywords = ['第一步', '第二步', '第三步', '关键', '注意', '建议', '不要', '必须', '一定', '核心', '方法', '步骤', 'SOP', '闭环', '重点'];
  return paragraphs
    .filter(p => keywords.some(word => p.includes(word)) || /\d+[.、]/.test(p))
    .slice(0, 6);
}

function detectMedia(markdown) {
  const media = [];
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = imageRegex.exec(markdown))) {
    const url = match[2];
    media.push({
      alt: match[1] || '配图',
      url,
      type: /\.gif($|\?)/i.test(url) ? 'GIF 动图' : '图片'
    });
  }
  return media.slice(0, 8);
}

function buildDraftChecklist(input = {}) {
  const markdown = String(input.markdown || '').trim();
  const html = String(input.html || '').trim();
  const appId = String(input.appId || '').trim();
  const appSecret = String(input.appSecret || '').trim();
  const thumbMediaId = String(input.thumbMediaId || '').trim();
  const info = markdown ? analyze(markdown) : { media: [], title: '' };
  const issues = [];
  const warnings = [];

  if (!markdown && !html) issues.push('请先粘贴文章并完成排版。');
  if (!appId) issues.push('缺少公众号 AppID。');
  if (!appSecret) issues.push('缺少公众号 AppSecret。');
  if (!thumbMediaId) issues.push('缺少封面素材 media_id，微信草稿箱接口要求必须填写。');

  const media = info.media || [];
  const gifs = media.filter(item => item.type === 'GIF 动图');
  if (media.length) {
    warnings.push(`文章中识别到 ${media.length} 个图片/GIF，建议先确认这些素材在公众号后台能稳定显示。`);
  }
  if (gifs.length) {
    warnings.push(`文章中有 ${gifs.length} 个 GIF，建议优先上传到公众号素材库或可靠图床后再推送草稿。`);
  }
  if (stripMarkdown(markdown).length > 20000) {
    warnings.push('文章较长，推送前建议先复制到公众号后台预览一次。');
  }

  return {
    ready: issues.length === 0,
    title: info.title || extractTitle(markdown || '未命名文章'),
    issues,
    warnings,
    media,
    steps: [
      '确认正文排版预览无错位。',
      '封面图先上传公众号素材库，复制 thumb_media_id 到本页。',
      '正文图片和 GIF 先确认来源稳定，重要素材建议入库。',
      '点击推送草稿箱后，到公众号后台做最终手机预览。'
    ]
  };
}

function recommendImageSlots(markdown, title, media) {
  const headings = markdown
    .split(/\r?\n/)
    .filter(line => /^#{2,3}\s+/.test(line))
    .map(line => stripMarkdown(line));
  const anchors = headings.length ? headings : ['开篇观点', '核心方法', '结尾行动'];
  const slots = anchors.slice(0, 3).map((anchor, index) => ({
    position: `${anchor} 之后`,
    type: index === 0 ? '场景图' : index === 1 ? '流程图 / 操作 GIF' : '金句图',
    prompt: buildImagePrompt(title, anchor, index)
  }));
  if (!media.some(item => item.type === 'GIF 动图')) {
    slots.splice(1, 0, {
      position: '关键操作步骤之后',
      type: 'GIF 动图',
      prompt: '建议插入 3-8 秒操作演示 GIF：展示从文章粘贴、一键排版、复制到公众号后台的过程。GIF 要短、清晰、循环自然。'
    });
  }
  return slots.slice(0, 4);
}

function buildImagePrompt(title, anchor, index = 0) {
  const style = '真实办公场景，中文互联网知识博主风格，干净、专业、有行动感，适合微信公众号正文配图，高清';
  if (index === 1) {
    return `围绕“${anchor}”制作一张 AI 工作流程图，包含文章、排版、封面提示词、公众号草稿箱几个节点，${style}`;
  }
  if (index === 2) {
    return `为文章《${title}》制作一张金句海报，主题是“${anchor}”，深色文字、浅色背景、留白充足，${style}`;
  }
  return `为文章《${title}》制作一张开篇场景图，画面体现内容创作者正在用 AI 完成公众号排版，屏幕中有文章预览和配图建议，${style}`;
}

function buildCoverPrompt(title, golden) {
  const line = golden[0] || title;
  return {
    prompt: `微信公众号封面图，主题《${title}》，画面表现内容创作者使用 AI 将文章一键排版成公众号爆文，屏幕中出现文章编辑器、金句高亮、封面提示词和发布草稿箱，真实办公场景，科技感但不过度炫光，温暖、专业、有行动感，16:9，高清，适合知识博主。`,
    text: title.length <= 16 ? title : `${title.slice(0, 16)}...`,
    style: '真实办公场景 + 知识博主封面 + 温暖科技感',
    avoid: '不要卡通感，不要过度赛博朋克，不要英文大字，不要杂乱背景',
    hook: line
  };
}

function analyze(markdown) {
  const title = extractTitle(markdown);
  const paragraphs = splitParagraphs(markdown);
  const goldenSentences = pickGoldenSentences(paragraphs);
  const importantParagraphs = pickImportantParagraphs(paragraphs);
  const media = detectMedia(markdown);
  return {
    title,
    goldenSentences,
    importantParagraphs,
    cover: buildCoverPrompt(title, goldenSentences),
    images: recommendImageSlots(markdown, title, media),
    media
  };
}

function renderImage(alt, url, theme) {
  const isGif = /\.gif($|\?)/i.test(url);
  return `<section style="margin:22px 0;text-align:center;">
    <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:640px;margin:0 auto;border-radius:8px;border:1px solid #e5e7eb;">
    <p style="margin:8px 0 0 0;color:${theme.muted};font-size:13px;line-height:1.6;">${isGif ? 'GIF 动图演示：' : ''}${escapeHtml(alt)}</p>
  </section>`;
}

function renderSpecialBlock(label, text, theme) {
  const map = {
    '金句': ['枫哥金句', theme.gold],
    '重点': ['重点提醒', theme.accent],
    '提醒': ['重点提醒', theme.accent],
    '注意': ['注意事项', '#dc2626']
  };
  const [title, color] = map[label] || ['重点', theme.accent];
  return `<section style="margin:18px 0;padding:15px 16px;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:8px;">
    <p style="margin:0 0 8px 0;color:${color};font-size:14px;font-weight:800;">${title}</p>
    <p style="margin:0;color:${theme.ink};font-size:16px;line-height:1.85;font-weight:700;">${inlineMarkdown(text)}</p>
  </section>`;
}

function parseMarkdown(markdown, theme) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inCode = false;
  let codeLines = [];
  let list = [];
  let table = [];

  function flushList() {
    if (!list.length) return;
    html.push(`<ul style="margin:10px 0 18px 0;padding-left:22px;color:${theme.ink};line-height:1.9;">${list.map(item => `<li style="margin:4px 0;">${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  }

  function flushTable() {
    if (!table.length) return;
    const rows = table.filter(row => !/^\|\s*-+/.test(row));
    const rendered = rows.map((row, index) => {
      const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
      const tag = index === 0 ? 'th' : 'td';
      return `<tr>${cells.map(cell => `<${tag} style="border:1px solid ${theme.border};padding:8px 10px;text-align:left;font-size:14px;line-height:1.7;color:${theme.ink};">${inlineMarkdown(cell)}</${tag}>`).join('')}</tr>`;
    }).join('');
    html.push(`<section style="margin:20px 0;overflow:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;">${rendered}</table></section>`);
    table = [];
  }

  function flushCode() {
    if (!inCode) return;
    html.push(`<pre style="white-space:pre-wrap;background:#111827;color:#f9fafb;border-radius:8px;padding:14px 16px;margin:18px 0;font-size:13px;line-height:1.7;overflow:auto;"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
    inCode = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line.trim())) {
      flushTable();
      if (inCode) flushCode();
      else {
        flushList();
        inCode = true;
        codeLines = [];
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }
    if (/^\|.+\|$/.test(trimmed)) {
      flushList();
      table.push(trimmed);
      continue;
    }
    flushTable();
    const image = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (image) {
      flushList();
      html.push(renderImage(image[1], image[2], theme));
      continue;
    }
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushList();
      html.push(`<section style="margin:28px 0;text-align:center;color:${theme.accent};letter-spacing:0;">◆ ◆ ◆</section>`);
      continue;
    }
    const special = trimmed.match(/^(金句|重点|提醒|注意)[:：]\s*(.+)$/);
    if (special) {
      flushList();
      html.push(renderSpecialBlock(special[1], special[2], theme));
      continue;
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const text = inlineMarkdown(heading[2]);
      if (level === 1) {
        html.push(`<h1 style="font-size:24px;line-height:1.35;font-weight:800;color:${theme.ink};margin:0 0 20px 0;">${text}</h1>`);
      } else if (level === 2) {
        html.push(`<h2 style="font-size:19px;line-height:1.45;font-weight:800;color:${theme.ink};border-left:5px solid ${theme.accent};padding-left:12px;margin:30px 0 14px 0;">${text}</h2>`);
      } else {
        html.push(`<h3 style="font-size:17px;line-height:1.5;font-weight:700;color:${theme.accent};margin:22px 0 10px 0;">${text}</h3>`);
      }
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushList();
      const text = trimmed.replace(/^>\s?/, '');
      html.push(`<blockquote style="margin:18px 0;padding:14px 16px;background:${theme.quoteBg};border-left:4px solid ${theme.accent};border-radius:6px;color:${theme.ink};line-height:1.85;">${inlineMarkdown(text)}</blockquote>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    const ordered = trimmed.match(/^\d+[.、]\s+(.+)$/);
    if (ordered) {
      list.push(ordered[1]);
      continue;
    }
    flushList();
    const isStrong = /\*\*[^*]+\*\*/.test(trimmed) || /^(关键|记住|真正|建议|结论)[:：]/.test(trimmed);
    if (isStrong) {
      html.push(`<p style="margin:16px 0;padding:12px 14px;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:8px;color:${theme.ink};font-size:15px;line-height:1.9;">${inlineMarkdown(trimmed)}</p>`);
    } else {
      html.push(`<p style="margin:14px 0;color:${theme.ink};font-size:15px;line-height:1.95;">${inlineMarkdown(trimmed)}</p>`);
    }
  }
  flushList();
  flushTable();
  flushCode();
  return html.join('\n');
}

function injectGoldenBlocks(html, golden, theme) {
  if (!golden.length) return html;
  const block = `<section style="margin:24px 0;padding:16px 18px;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:8px;">
    <p style="margin:0 0 8px 0;color:${theme.accent};font-weight:800;font-size:14px;">枫哥金句</p>
    <p style="margin:0;color:${theme.ink};font-size:18px;line-height:1.7;font-weight:800;">${escapeHtml(golden[0])}</p>
  </section>`;
  const marker = '</h1>';
  if (html.includes(marker)) return html.replace(marker, `${marker}\n${block}`);
  return `${block}\n${html}`;
}

function renderArticle(markdown, themeId = 'fenge') {
  const theme = themes[themeId] || themes.fenge;
  const info = analyze(markdown);
  const body = injectGoldenBlocks(parseMarkdown(markdown, theme), info.goldenSentences, theme);
  const html = `<section data-fenge-wechat="article" style="max-width:677px;margin:0 auto;padding:8px 0 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;color:${theme.ink};">
  <section style="margin:0 0 22px 0;padding:12px 14px;border-radius:8px;background:${theme.accentSoft};border:1px solid ${theme.border};">
    <p style="margin:0;color:${theme.accent};font-size:13px;font-weight:800;">${theme.name}</p>
    <p style="margin:6px 0 0 0;color:${theme.muted};font-size:13px;line-height:1.7;">文章已完成公众号移动端排版，可复制到公众号后台继续微调。</p>
  </section>
  ${body}
  <section style="margin:30px 0 0 0;padding:18px 16px;border-top:1px solid #e5e7eb;text-align:center;color:${theme.muted};font-size:13px;line-height:1.8;">
    <p style="margin:0;">工具是手段，内容才是核心。用好 AI，让创作更自由，影响力更长久。</p>
  </section>
</section>`;
  return { html, analysis: info, theme: theme.name };
}

async function callWechatJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || data.errcode) {
    const err = new Error(data.errmsg || `WeChat API failed: ${response.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

async function getWechatToken(appId, appSecret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.errcode) {
    const err = new Error(data.errmsg || 'Failed to get access_token');
    err.payload = data;
    throw err;
  }
  return data.access_token;
}

async function handleFormat(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch {
    return sendJson(res, 400, { error: '请求 JSON 格式不正确' });
  }
  const markdown = String(body.markdown || '').trim();
  if (!markdown) return sendJson(res, 400, { error: '请输入文章内容' });
  const result = renderArticle(markdown, body.theme || 'fenge');
  sendJson(res, 200, result);
}

async function handleDraftCheck(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch {
    return sendJson(res, 400, { error: '请求 JSON 格式不正确' });
  }
  sendJson(res, 200, buildDraftChecklist(body));
}

async function handleDraft(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch {
    return sendJson(res, 400, { error: '请求 JSON 格式不正确' });
  }
  const { appId, appSecret, markdown, html, theme, author, digest, thumbMediaId, contentSourceUrl } = body;
  const checklist = buildDraftChecklist(body);
  if (!checklist.ready) return sendJson(res, 400, { error: checklist.issues.join('；'), checklist });
  const articleHtml = html || renderArticle(String(markdown || ''), theme || 'fenge').html;
  const title = extractTitle(String(markdown || '未命名文章'));
  const token = await getWechatToken(appId, appSecret);
  const draft = await callWechatJson(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`, {
    articles: [{
      title: title.slice(0, 64),
      author: author || '',
      digest: (digest || stripMarkdown(String(markdown || '')).slice(0, 120)).slice(0, 120),
      content: articleHtml,
      content_source_url: contentSourceUrl || '',
      thumb_media_id: thumbMediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0
    }]
  });
  sendJson(res, 200, { success: true, mediaId: draft.media_id, message: '已推送到公众号草稿箱' });
}

function serveStatic(req, res) {
  let requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (requestPath === BASE_PATH) {
    res.writeHead(302, { Location: `${BASE_PATH}/` });
    res.end();
    return;
  }
  requestPath = requestPath.replace(new RegExp(`^${BASE_PATH}`), '') || '/';
  const filePath = requestPath === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, requestPath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) return sendText(res, 403, 'Forbidden');
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) return sendText(res, 404, 'Not found');
  const ext = path.extname(resolved).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  sendText(res, 200, fs.readFileSync(resolved), types[ext] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'POST' && pathname === '/api/format') return await handleFormat(req, res);
    if (req.method === 'POST' && pathname === '/api/draft-check') return await handleDraftCheck(req, res);
    if (req.method === 'POST' && pathname === '/api/draft') return await handleDraft(req, res);
    if (req.method === 'POST' && pathname === `${BASE_PATH}/api/format`) return await handleFormat(req, res);
    if (req.method === 'POST' && pathname === `${BASE_PATH}/api/draft-check`) return await handleDraftCheck(req, res);
    if (req.method === 'POST' && pathname === `${BASE_PATH}/api/draft`) return await handleDraft(req, res);
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) return serveStatic(req, res);
    sendText(res, 404, 'Not found');
  } catch (error) {
    const id = crypto.randomBytes(4).toString('hex');
    console.error(`[${id}]`, error.message);
    sendJson(res, 500, { error: '服务处理失败', requestId: id });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Fenge WeChat formatter listening on ${PORT}`);
  });
}

module.exports = { analyze, renderArticle, extractTitle, buildDraftChecklist, server };

const $ = (selector) => document.querySelector(selector);

let currentHtml = '';
let currentAnalysis = null;
const assistantImportKey = 'fenge_wechat_import_markdown';

const sample = `# 普通人做 AI 内容，最该补的不是工具数量

很多人一听 AI 内容创作，就开始收藏工具、研究模型、对比插件。

真正的问题不是工具不够，而是没有把一个选题从写作、排版、配图到发布跑成闭环。

金句：工具只是手段，内容才是核心。

## 第一步：先把文章写清楚

不要一上来就追求复杂排版。先把观点、案例、行动建议写出来。

重点：一篇好文章，首先要让读者读完后知道下一步该做什么。

## 第二步：把重复动作交给 AI

- 识别金句
- 提炼重点段落
- 生成封面图提示词
- 建议配图和 GIF 演示位置

![操作演示 GIF](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9uc2s5YzB0eWRiM2x5cnFhdWFsbzllMTh4cTd1NWM2eGFrZ2U3biZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26tn33aiTi1jkl6H6/giphy.gif)

---

记住，普通人用 AI 变强，不是靠收藏 100 个工具，而是靠把一个工作流反复打磨到能交付结果。`;

const snippets = {
  gold: '\n\n金句：把复杂的事情跑成闭环，才是真正的进步。\n',
  note: '\n\n重点：这里放需要读者停下来看的一句关键提醒。\n',
  steps: '\n\n## 三步落地\n\n1. 第一步：明确目标\n2. 第二步：拆成动作\n3. 第三步：当天验证\n',
  compare: '\n\n| 对比项 | 过去做法 | AI 工作流 |\n| --- | --- | --- |\n| 写作 | 靠灵感 | 靠结构 |\n| 排版 | 手动调整 | 一键生成 |\n| 发布 | 反复复制 | 草稿箱联动 |\n',
  divider: '\n\n---\n',
  cta: '\n\n## 最后\n\n如果这篇文章对你有启发，欢迎收藏，也可以把你的问题发给我，我们一起把它做成能用的 AI 工作流。\n'
};

const materials = [
  {
    category: 'opening',
    name: '痛点开场卡',
    desc: '适合教程、观点文开头',
    content: '\n\n重点：如果你也经常遇到“想写但不知道怎么组织、写完又不知道怎么排版”的问题，这篇文章会把一个可执行的方法讲清楚。\n'
  },
  {
    category: 'opening',
    name: '一句话观点卡',
    desc: '开篇直接抛出主张',
    content: '\n\n金句：真正拉开差距的，不是你收藏了多少工具，而是你能不能把工具变成稳定产出的工作流。\n'
  },
  {
    category: 'opening',
    name: '今日主题卡',
    desc: '快速交代本文要解决什么',
    content: '\n\n## 今天聊一个具体问题\n\n如何把一篇普通文章，快速变成适合公众号发布的完整稿件：有标题、有结构、有重点、有配图建议，也有可以直接复制的排版。\n'
  },
  {
    category: 'body',
    name: '金句强调卡',
    desc: '突出文章中最值得传播的一句话',
    content: '\n\n金句：内容创作不是追求热闹，而是把自己的经验变成别人能直接拿走的方法。\n'
  },
  {
    category: 'body',
    name: '重点提醒卡',
    desc: '提醒读者注意关键动作',
    content: '\n\n重点：不要把 AI 当成万能按钮。你越能把任务描述清楚，AI 给你的结果越稳定。\n'
  },
  {
    category: 'body',
    name: '三步方法卡',
    desc: '适合方法论文章正文',
    content: '\n\n## 你可以按这三步做\n\n1. 先写出核心观点，不要急着美化。\n2. 再让 AI 帮你提炼结构、金句和标题。\n3. 最后统一排版，补上封面提示词和配图位置。\n'
  },
  {
    category: 'body',
    name: '案例拆解卡',
    desc: '把案例讲得更像实战复盘',
    content: '\n\n## 一个真实案例\n\n背景：这里写用户遇到的问题。\n\n动作：这里写你具体做了哪几步。\n\n结果：这里写变化、数据或肉眼可见的改进。\n\n复盘：真正有效的不是单点技巧，而是可以重复执行的流程。\n'
  },
  {
    category: 'body',
    name: '对比表组件',
    desc: '适合说明新旧方法差异',
    content: '\n\n| 对比项 | 传统做法 | AI 工作流 |\n| --- | --- | --- |\n| 选题 | 靠灵感 | 靠问题库和数据 |\n| 写作 | 从零硬写 | 先搭结构再填内容 |\n| 排版 | 手动调整 | 模板化一键生成 |\n| 发布 | 反复复制 | 预览后直接粘贴 |\n'
  },
  {
    category: 'body',
    name: '行动清单卡',
    desc: '让读者读完马上行动',
    content: '\n\n## 你现在就可以做\n\n- 打开一篇旧文章\n- 提取 3 句最有价值的话\n- 补一个案例\n- 加一个步骤清单\n- 用排版助手生成公众号稿\n'
  },
  {
    category: 'body',
    name: '常见误区卡',
    desc: '适合观点纠偏',
    content: '\n\n## 很多人会踩的坑\n\n- 只收藏工具，不真正使用\n- 只追求炫酷，不解决问题\n- 只看教程，不做自己的作品\n- 写完文章，却没有发布闭环\n'
  },
  {
    category: 'divider',
    name: '简洁分割线',
    desc: '最稳妥的正文分隔',
    content: '\n\n---\n'
  },
  {
    category: 'divider',
    name: '阶段转换线',
    desc: '用于从观点切到方法',
    content: '\n\n---\n\n接下来，我们不讲概念，直接看具体怎么做。\n'
  },
  {
    category: 'divider',
    name: '复盘分割线',
    desc: '用于结尾复盘前',
    content: '\n\n---\n\n## 最后复盘一下\n'
  },
  {
    category: 'ending',
    name: '关注引导卡',
    desc: '温和引导关注',
    content: '\n\n## 写在最后\n\n如果你也想把 AI 变成自己的创作助手，而不是只停留在收藏工具，欢迎持续关注我。后面我会继续分享更多能直接落地的 AI 工作流。\n'
  },
  {
    category: 'ending',
    name: '社群引导卡',
    desc: '适合引导加入社群',
    content: '\n\n重点：如果你想和一群行动派一起练习 AI 写作、排版、自动化和作品发布，可以留意后续社群开放信息。\n'
  },
  {
    category: 'ending',
    name: '课程转化卡',
    desc: '适合课程或训练营文章结尾',
    content: '\n\n## 适合继续学习的人\n\n如果你不想只停留在“看懂”，而是想真正做出自己的 AI 工具、文章和作品，可以从一个小项目开始练。先跑通闭环，再慢慢升级。\n'
  },
  {
    category: 'ending',
    name: '留言关键词卡',
    desc: '适合资料领取',
    content: '\n\n提醒：如果你需要这篇文章里的流程清单，可以在留言区回复关键词「AI工作流」，我会把整理版继续补上。\n'
  },
  {
    category: 'gif',
    name: '操作演示 GIF',
    desc: '替换为自己的操作录屏 GIF',
    content: '\n\n![操作演示 GIF](请把这里替换成你的 GIF 图片地址)\n'
  },
  {
    category: 'gif',
    name: '生成过程 GIF',
    desc: '展示 AI 生成或排版过程',
    content: '\n\n![AI 生成过程演示](请把这里替换成你的 GIF 图片地址)\n\n重点：这里可以用一个 3-8 秒的短 GIF，展示从输入到生成结果的关键过程。\n'
  },
  {
    category: 'prompt',
    name: '封面提示词卡',
    desc: '给封面图生成工具使用',
    content: '\n\n## 封面图提示词\n\n微信公众号封面图，主题是“把 AI 变成内容创作工作流”，画面表现一位内容创作者在电脑前使用 AI 完成写作、排版、配图和发布，整体风格专业、干净、明亮，有科技感但不过度炫光，适合知识博主，16:9，高清。\n'
  }
];

const categoryNames = {
  opening: '开头',
  body: '正文',
  divider: '分割',
  ending: '转化',
  gif: 'GIF',
  prompt: '提示词'
};

function api(path) {
  const prefix = window.location.pathname.startsWith('/wechat') ? '/wechat' : '';
  return `${prefix}${path}`;
}

async function postJson(path, payload) {
  const response = await fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderList(items) {
  if (!items || !items.length) return '<p class="muted">暂无识别结果</p>';
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderAnalysis(data) {
  currentAnalysis = data;
  $('#analysis').innerHTML = `
    <div class="card">
      <h3>金句</h3>
      ${renderList(data.goldenSentences)}
    </div>
    <div class="card">
      <h3>重点段落</h3>
      ${renderList(data.importantParagraphs)}
    </div>
    <div class="card">
      <h3>封面图提示词</h3>
      <p class="prompt">${escapeHtml(data.cover.prompt)}</p>
      <p><strong>封面文字：</strong>${escapeHtml(data.cover.text)}</p>
      <p><strong>避免：</strong>${escapeHtml(data.cover.avoid)}</p>
    </div>
    <div class="card">
      <h3>配图与 GIF 建议</h3>
      ${data.images.map(item => `
        <p><strong>${escapeHtml(item.position)}</strong> · ${escapeHtml(item.type)}</p>
        <p class="prompt">${escapeHtml(item.prompt)}</p>
      `).join('')}
      ${data.media && data.media.length ? `<p><strong>已识别媒体：</strong>${data.media.map(item => escapeHtml(item.type)).join('、')}</p>` : ''}
    </div>
  `;
}

async function formatArticle() {
  const markdown = $('#markdownInput').value.trim();
  if (!markdown) {
    setStatus('请先粘贴文章。');
    return;
  }
  setStatus('正在排版...');
  const result = await postJson('/api/format', {
    markdown,
    theme: $('#themeSelect').value
  });
  currentHtml = result.html;
  $('#preview').classList.remove('empty');
  $('#preview').innerHTML = result.html;
  renderAnalysis(result.analysis);
  setStatus('排版完成。');
}

async function copyRichHtml() {
  if (!currentHtml) await formatArticle();
  const blobHtml = new Blob([currentHtml], { type: 'text/html' });
  const blobText = new Blob([$('#preview').innerText], { type: 'text/plain' });
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
    ]);
    setStatus('已复制，可直接粘贴到公众号后台。');
  } catch (error) {
    await navigator.clipboard.writeText(currentHtml);
    setStatus('浏览器不支持富文本复制，已复制 HTML 源码。');
  }
}

async function copyHtml() {
  if (!currentHtml) await formatArticle();
  await navigator.clipboard.writeText(currentHtml);
  setStatus('HTML 源码已复制。');
}

async function pushDraft() {
  if (!currentHtml) await formatArticle();
  setStatus('正在推送草稿箱...');
  const result = await postJson('/api/draft', {
    markdown: $('#markdownInput').value,
    html: currentHtml,
    theme: $('#themeSelect').value,
    appId: $('#appId').value.trim(),
    appSecret: $('#appSecret').value.trim(),
    author: $('#author').value.trim(),
    digest: $('#digest').value.trim(),
    thumbMediaId: $('#thumbMediaId').value.trim(),
    contentSourceUrl: $('#sourceUrl').value.trim()
  });
  setStatus(`${result.message}：${result.mediaId || ''}`);
}

function setStatus(message) {
  $('#status').textContent = message;
}

function clearAll() {
  $('#markdownInput').value = '';
  localStorage.removeItem(assistantImportKey);
  localStorage.removeItem(`${assistantImportKey}_time`);
  $('#preview').classList.add('empty');
  $('#preview').textContent = '排版结果会显示在这里。';
  $('#analysis').innerHTML = $('#emptyAnalysis').innerHTML;
  currentHtml = '';
  currentAnalysis = null;
  setStatus('');
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  const next = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(next, next);
}

function insertGif() {
  const url = $('#gifUrl').value.trim();
  if (!url) {
    setStatus('先粘贴 GIF 图片地址。');
    return;
  }
  const alt = $('#gifAlt').value.trim() || 'GIF 动图演示';
  insertAtCursor($('#markdownInput'), `\n\n![${alt}](${url})\n`);
  setStatus('GIF 已插入文章，可点击一键排版预览。');
}

function renderMaterialLibrary() {
  const filter = $('#materialFilter').value;
  const list = filter === 'all' ? materials : materials.filter(item => item.category === filter);
  $('#materialGrid').innerHTML = list.map((item, index) => `
    <button class="material-card" type="button" data-material="${materials.indexOf(item)}">
      <span>${categoryNames[item.category]}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <em>${escapeHtml(item.desc)}</em>
    </button>
  `).join('');
  document.querySelectorAll('[data-material]').forEach(button => {
    button.addEventListener('click', () => {
      const item = materials[Number(button.dataset.material)];
      insertAtCursor($('#markdownInput'), item.content);
      setStatus(`已插入素材：${item.name}`);
    });
  });
}

$('#formatBtn').addEventListener('click', () => formatArticle().catch(error => setStatus(error.message)));
$('#copyBtn').addEventListener('click', () => copyRichHtml().catch(error => setStatus(error.message)));
$('#copyHtmlBtn').addEventListener('click', () => copyHtml().catch(error => setStatus(error.message)));
$('#draftBtn').addEventListener('click', () => pushDraft().catch(error => setStatus(error.message)));
$('#sampleBtn').addEventListener('click', () => {
  $('#markdownInput').value = sample;
  formatArticle().catch(error => setStatus(error.message));
});
$('#clearBtn').addEventListener('click', clearAll);
$('#insertGifBtn').addEventListener('click', insertGif);
$('#materialFilter').addEventListener('change', renderMaterialLibrary);
document.querySelectorAll('[data-snippet]').forEach(button => {
  button.addEventListener('click', () => {
    insertAtCursor($('#markdownInput'), snippets[button.dataset.snippet] || '');
  });
});
$('#themeSelect').addEventListener('change', () => {
  if ($('#markdownInput').value.trim()) formatArticle().catch(error => setStatus(error.message));
});

renderMaterialLibrary();
$('#analysis').innerHTML = $('#emptyAnalysis').innerHTML;
const importedMarkdown = localStorage.getItem(assistantImportKey);
if (importedMarkdown && importedMarkdown.trim()) {
  $('#markdownInput').value = importedMarkdown;
  setStatus('已从个人 AI 创作助手载入文章。');
} else {
  $('#markdownInput').value = sample;
}
formatArticle().catch(error => setStatus(error.message));

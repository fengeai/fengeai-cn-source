const $ = (selector) => document.querySelector(selector);

let currentHtml = '';
const assistantImportKey = 'fenge_wechat_import_markdown';
const defaultTheme = 'minimal';

const sample = `# 普通人做 AI 内容，先别堆工具

很多人一听 AI 内容创作，就开始收藏工具、研究模型、对比插件。

真正的问题不是工具不够，而是没有把一个选题从写作、排版到发布跑成闭环。

金句：工具只是手段，内容才是核心。

## 第一步：先把文章写清楚

不要一上来就追求复杂排版。先把观点、案例和行动建议写出来。

## 第二步：把重复动作交给 AI

- 整理标题层级
- 强调关键句
- 统一段落间距
- 生成适合公众号后台的清爽版式

记住：普通人用 AI 变强，不是靠收藏 100 个工具，而是靠把一个工作流反复打磨到能交付结果。`;

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

async function formatArticle() {
  const markdown = $('#markdownInput').value.trim();
  if (!markdown) {
    setStatus('请先粘贴文章。');
    return;
  }

  setStatus('正在排版...');
  const result = await postJson('/api/format', {
    markdown,
    theme: defaultTheme
  });

  currentHtml = result.html;
  $('#preview').classList.remove('empty');
  $('#preview').innerHTML = result.html;
  setStatus('排版完成。');
}

async function copyRichHtml() {
  if (!currentHtml) await formatArticle();
  if (!currentHtml) return;

  const blobHtml = new Blob([currentHtml], { type: 'text/html' });
  const blobText = new Blob([$('#preview').innerText], { type: 'text/plain' });

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
    ]);
    setStatus('已复制，可直接粘贴到公众号后台。');
  } catch (error) {
    await navigator.clipboard.writeText($('#preview').innerText);
    setStatus('已复制纯文本，浏览器未允许富文本复制。');
  }
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
  currentHtml = '';
  setStatus('');
}

$('#formatBtn').addEventListener('click', () => formatArticle().catch(error => setStatus(error.message)));
$('#copyBtn').addEventListener('click', () => copyRichHtml().catch(error => setStatus(error.message)));
$('#sampleBtn').addEventListener('click', () => {
  $('#markdownInput').value = sample;
  formatArticle().catch(error => setStatus(error.message));
});
$('#clearBtn').addEventListener('click', clearAll);

const importedMarkdown = localStorage.getItem(assistantImportKey);
$('#markdownInput').value = importedMarkdown && importedMarkdown.trim() ? importedMarkdown : sample;
formatArticle().catch(error => setStatus(error.message));

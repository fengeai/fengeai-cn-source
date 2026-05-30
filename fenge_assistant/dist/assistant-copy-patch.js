(function () {
  const replacements = new Map([
    ['个人AI创作助手', '今天不知道写什么？'],
    ['把每个人的身份、经历、风格和偏好固化成专属 Skill，陪你完成选题、写作、修改和排版前的准备工作。', '输入一个方向，我帮你生成公众号文章选题、框架和可继续打磨的初稿。'],
    ['开始创作 ', '生成今日选题和文章框架'],
    ['文章创作', '内容工厂'],
    ['枫哥AI进化社 · 高级创作工具', '枫哥AI进化社 · 内容生产工作台'],
    ['用专属 Skill 串起选题、大纲、正文、标题和改稿，形成固定创作流程。', '从一个方向开始，生成选题、大纲、正文、标题和发布前素材。']
  ]);

  const examples = [
    'AI 写作为什么越来越难出爆文？',
    '中年人如何用 AI 做副业？',
    '普通人怎么用 AI 做一个工具站？'
  ];

  function replaceText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue;
      const next = replacements.get(value);
      if (next) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    node.childNodes.forEach(replaceText);
  }

  function addExamples() {
    if (document.querySelector('[data-fenge-examples]')) return;
    const target = Array.from(document.querySelectorAll('textarea, input[placeholder], [contenteditable="true"]'))[0];
    if (!target) return;
    const row = document.createElement('div');
    row.dataset.fengeExamples = 'true';
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '8px';
    row.style.margin = '10px 0 14px';
    examples.forEach(text => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.style.border = '1px solid #dbeafe';
      button.style.background = '#eff6ff';
      button.style.color = '#1d4ed8';
      button.style.borderRadius = '8px';
      button.style.padding = '8px 10px';
      button.style.fontSize = '13px';
      button.style.fontWeight = '700';
      button.addEventListener('click', () => {
        if ('value' in target) {
          target.value = text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          target.textContent = text;
        }
        target.focus();
      });
      row.appendChild(button);
    });
    target.parentElement.insertBefore(row, target);
  }

  function runPatch() {
    replaceText(document.body);
    addExamples();
  }

  const observer = new MutationObserver(runPatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', runPatch);
  setTimeout(runPatch, 600);
  setTimeout(runPatch, 1800);
})();

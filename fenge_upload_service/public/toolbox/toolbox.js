const tools = [
  { category: 'writing', name: 'Kimi', icon: '文', use: '长文本阅读、资料整理、文章初稿和选题扩展。', fit: '适合公众号作者和资料型写作。', link: 'https://kimi.moonshot.cn' },
  { category: 'writing', name: '豆包', icon: '写', use: '日常写作、标题改写、口播稿和短内容生产。', fit: '适合 AI 新手快速上手。', link: 'https://www.doubao.com' },
  { category: 'writing', name: '秘塔 AI 搜索', icon: '搜', use: '围绕一个主题快速查资料、找观点和生成参考来源。', fit: '适合写热点、科普和观点文。', link: 'https://metaso.cn' },
  { category: 'writing', name: 'Notion AI', icon: '记', use: '把选题、资料、草稿和复盘沉淀到一个知识库。', fit: '适合长期内容创作者。', link: 'https://www.notion.so/product/ai' },

  { category: 'coding', name: 'Cursor', icon: '码', use: 'AI 辅助写代码、改页面、读项目和生成小工具。', fit: '适合想做工具站的普通人。', link: 'https://cursor.com' },
  { category: 'coding', name: 'GitHub Copilot', icon: '补', use: '在编辑器里补全代码、解释函数和生成测试。', fit: '适合已有编程基础的人。', link: 'https://github.com/features/copilot' },
  { category: 'coding', name: 'CodePen', icon: '验', use: '快速验证网页组件、动效和前端小实验。', fit: '适合做页面原型和教学案例。', link: 'https://codepen.io' },
  { category: 'coding', name: 'Vercel', icon: '发', use: '把前端项目快速部署成可访问的网站。', fit: '适合发布个人工具和作品集。', link: 'https://vercel.com' },

  { category: 'design', name: '即梦 AI', icon: '图', use: '生成图片、视频和创意视觉素材。', fit: '适合短视频和封面创作者。', link: 'https://jimeng.jianying.com' },
  { category: 'design', name: '可灵 AI', icon: '影', use: '生成高质量 AI 视频和动态素材。', fit: '适合视频号、小红书和课程演示。', link: 'https://klingai.com' },
  { category: 'design', name: '稿定设计', icon: '设', use: '做公众号封面、海报、课程图和社群宣传图。', fit: '适合不想从零设计的人。', link: 'https://www.gaoding.com' },
  { category: 'design', name: 'remove.bg', icon: '抠', use: '一键抠图，快速处理人物、产品和封面素材。', fit: '适合做封面合成。', link: 'https://www.remove.bg/zh' },

  { category: 'media', name: '新榜', icon: '榜', use: '看公众号内容趋势、账号案例和行业榜单。', fit: '适合找选题和拆案例。', link: 'https://www.newrank.cn' },
  { category: 'media', name: '剪映', icon: '剪', use: '剪辑短视频、自动字幕、口播包装和模板套用。', fit: '适合视频号和小红书运营。', link: 'https://www.capcut.cn' },
  { category: 'media', name: '飞书妙记', icon: '录', use: '把会议、访谈和课程录音转成文字稿。', fit: '适合把口头内容变文章。', link: 'https://www.feishu.cn/product/minutes' },
  { category: 'media', name: '135 编辑器', icon: '排', use: '公众号图文样式、排版组件和素材模板。', fit: '适合需要更多排版样式的人。', link: 'https://www.135editor.com' },

  { category: 'resource', name: 'Pexels', icon: '片', use: '免费商用图片和视频素材。', fit: '适合文章配图和视频素材。', link: 'https://www.pexels.com/zh-cn' },
  { category: 'resource', name: 'Pixabay', icon: '素', use: '图片、视频、音乐和音效素材库。', fit: '适合全平台内容素材补充。', link: 'https://pixabay.com' },
  { category: 'resource', name: 'Iconfont', icon: '标', use: '中文图标库，适合做网页、PPT 和封面图标。', fit: '适合工具页和课程材料。', link: 'https://www.iconfont.cn' },
  { category: 'resource', name: '阿里云盘 / 夸克网盘', icon: '云', use: '整理课程资料、模板包和项目交付文件。', fit: '适合社群资料分发。', link: 'https://pan.quark.cn' }
];

const categoryNames = {
  all: '全部',
  writing: 'AI 写作',
  coding: 'AI 编程',
  design: '图片设计',
  media: '自媒体运营',
  resource: '素材资源'
};

let activeCategory = 'all';
let keyword = '';

function matches(tool) {
  const inCategory = activeCategory === 'all' || tool.category === activeCategory;
  const text = `${tool.name} ${tool.use} ${tool.fit} ${categoryNames[tool.category]}`.toLowerCase();
  return inCategory && text.includes(keyword.toLowerCase());
}

function renderTools() {
  const list = tools.filter(matches);
  const grid = document.getElementById('toolGrid');
  const stats = document.getElementById('statsText');

  stats.innerHTML = keyword
    ? `找到 <strong>${list.length}</strong> 个匹配结果`
    : `共精选 <strong>${tools.length}</strong> 个工具和资源`;

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">没有找到匹配工具，可以换一个关键词试试。</div>';
    return;
  }

  grid.innerHTML = list.map(tool => `
    <article class="tool-card">
      <div class="tool-card-top">
        <div class="tool-icon">${tool.icon}</div>
        <h2>${tool.name}</h2>
      </div>
      <p>${tool.use}</p>
      <div class="tool-fit">${tool.fit}</div>
      <a href="${tool.link}" target="_blank" rel="noopener">访问工具</a>
    </article>
  `).join('');

}

document.getElementById('searchInput').addEventListener('input', event => {
  keyword = event.target.value.trim();
  renderTools();
});

document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    activeCategory = button.dataset.category;
    renderTools();
  });
});

renderTools();

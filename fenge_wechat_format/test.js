const assert = require('assert');
const { analyze, renderArticle, extractTitle, buildDraftChecklist } = require('./server');

const markdown = `# 测试标题

真正的问题不是你不会代码，而是你没有把一个想法跑成闭环。

## 第一步：先做 MVP

**关键：先让流程跑起来。**

> 好工具要少走一步。
`;

const title = extractTitle(markdown);
assert.equal(title, '测试标题');

const analysis = analyze(markdown);
assert.equal(analysis.title, '测试标题');
assert.ok(analysis.goldenSentences.length >= 1);
assert.ok(analysis.cover.prompt.includes('测试标题'));
assert.ok(analysis.images.length >= 1);

const result = renderArticle(markdown, 'fenge');
assert.ok(result.html.includes('枫哥爆文排版模板'));
assert.ok(result.html.includes('测试标题'));
assert.ok(result.html.includes('blockquote'));

const draftCheck = buildDraftChecklist({
  markdown,
  html: result.html,
  appId: 'wx_test',
  appSecret: 'secret',
  thumbMediaId: 'media_test'
});
assert.equal(draftCheck.ready, true);
assert.equal(draftCheck.title, '测试标题');

const missingDraftCheck = buildDraftChecklist({ markdown });
assert.equal(missingDraftCheck.ready, false);
assert.ok(missingDraftCheck.issues.some(item => item.includes('AppID')));

console.log('All tests passed');

import type { HotSearchResult } from '@content-assistant/shared';

const requestHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7',
};

const domesticSourceRules = [
  {
    host: 'zhuanlan.zhihu.com',
    source: '知乎专栏结果',
    account: '知乎专栏',
    angle: '知乎专栏内容，适合补充国内用户视角和案例',
  },
  {
    host: 'zhihu.com',
    source: '知乎搜索结果',
    account: '知乎',
    angle: '知乎讨论内容，适合判断国内用户关注点和争议点',
  },
  {
    host: '36kr.com',
    source: '36氪 AI 热点',
    account: '36氪',
    angle: '国内科技媒体热点，适合判断商业化和创业趋势',
  },
  {
    host: 'qbitai.com',
    source: '量子位热点',
    account: '量子位',
    angle: '国内 AI 媒体热点，适合提炼技术变化和大众表达',
  },
  {
    host: 'jiqizhixin.com',
    source: '机器之心热点',
    account: '机器之心',
    angle: '国内 AI 媒体内容，适合补充技术背景和可信资料',
  },
  {
    host: 'infoq.cn',
    source: 'InfoQ 中文站',
    account: 'InfoQ',
    angle: '国内技术社区内容，适合补充工程实践和案例',
  },
  {
    host: 'leiphone.com',
    source: '雷峰网热点',
    account: '雷峰网',
    angle: '国内科技产业报道，适合观察产品和行业变化',
  },
  {
    host: 'mp.weixin.qq.com',
    source: '微信公众号网页结果',
    account: '微信公众号',
    angle: '公众号公开文章，适合做标题和结构拆解',
  },
];

function decodeHtml(value = ''): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ldquo: '“',
    rdquo: '”',
    lsquo: '‘',
    rsquo: '’',
    mdash: '—',
    ndash: '–',
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name: string) => entities[name] || `&${name};`)
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value = ''): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/section>|<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\n\s+/g, '\n')
    .trim();
}

function getDomesticSourceRule(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return domesticSourceRules.find(
      (rule) => hostname === rule.host || hostname.endsWith(`.${rule.host}`),
    );
  } catch {
    return null;
  }
}

function parseSearchResults(html: string): HotSearchResult[] {
  const results: HotSearchResult[] = [];
  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/gi) || [];

  for (const block of blocks) {
    const linkMatch = block.match(
      /<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    ) || block.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const url = decodeHtml(linkMatch[1]);
    if (!/^https?:\/\//i.test(url) || url.includes('bing.com/ck/')) continue;

    const sourceRule = getDomesticSourceRule(url);
    if (!sourceRule) continue;

    const title = stripTags(linkMatch[2]);
    const snippet = stripTags((block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');
    if (!title) continue;

    results.push({
      id: `${url}-${results.length}`,
      title,
      account: sourceRule.account,
      summary: snippet || '搜索结果未返回摘要，可点击原文继续查看。',
      angle: sourceRule.angle,
      score: Math.max(70, 96 - results.length * 4),
      heat: results.length < 2 ? '优先' : results.length < 5 ? '参考' : '补充',
      publishTime: '',
      source: sourceRule.source,
      url,
    });

    if (results.length >= 10) break;
  }

  return results;
}

function parseSogouWechatResults(html: string): HotSearchResult[] {
  const results: HotSearchResult[] = [];
  const blocks = html.match(/<li[^>]+id=["']sogou_vr_11002601_box_[\s\S]*?<\/li>/gi) || [];

  for (const block of blocks) {
    const linkMatch = block.match(
      /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    const href = decodeHtml(linkMatch[1]);
    const url = href.startsWith('http') ? href : `https://weixin.sogou.com${href}`;
    const title = stripTags(linkMatch[2]);
    const summary = stripTags(
      (block.match(/<p[^>]+class=["']txt-info["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '',
    );
    const account = stripTags(
      (block.match(/<span[^>]+class=["']all-time-y2["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
        || '微信公众号',
    );
    const timestamp = (block.match(/timeConvert\(['"](\d+)['"]\)/i) || [])[1];
    const publishTime = timestamp ? new Date(Number(timestamp) * 1000).toISOString().slice(0, 10) : '';
    if (!title) continue;

    results.push({
      id: `${url}-${results.length}`,
      title,
      account,
      summary: summary || '搜狗微信未返回摘要，可点击原文继续查看。',
      angle: '公众号公开文章，适合做标题和结构拆解',
      score: Math.max(72, 98 - results.length * 4),
      heat: results.length < 2 ? '优先' : results.length < 5 ? '参考' : '补充',
      publishTime,
      source: '搜狗微信文章搜索',
      url,
    });

    if (results.length >= 8) break;
  }

  return results;
}

async function fetchText(url: string, timeoutMs = 12_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });

    if (!response.ok) {
      return '';
    }

    return await response.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function searchDomestic(query: string, seen: Set<string>): Promise<HotSearchResult[]> {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=cn&setlang=zh-Hans`;
  const html = await fetchText(searchUrl);
  if (!html) return [];

  return parseSearchResults(html).filter((result) => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}

export async function searchHotTopics(keyword: string): Promise<HotSearchResult[]> {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  const sogouUrl = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(normalizedKeyword)}`;
  const sogouHtml = await fetchText(sogouUrl);
  const sogouResults = sogouHtml ? parseSogouWechatResults(sogouHtml) : [];
  const seen = new Set(sogouResults.map((result) => result.url));

  const zhihuResults = await searchDomestic(`site:zhihu.com ${normalizedKeyword}`, seen);
  const mediaResults = await searchDomestic(
    `(${[
      'site:36kr.com',
      'site:qbitai.com',
      'site:jiqizhixin.com',
      'site:infoq.cn',
      'site:leiphone.com',
    ].join(' OR ')}) ${normalizedKeyword}`,
    seen,
  );

  const results = [
    ...sogouResults.slice(0, 6),
    ...zhihuResults.slice(0, 3),
    ...mediaResults.slice(0, 2),
    ...sogouResults.slice(6),
  ];
  const seenInOutput = new Set<string>();

  return results
    .filter((result) => {
      if (seenInOutput.has(result.url)) return false;
      seenInOutput.add(result.url);
      return true;
    })
    .slice(0, 10);
}

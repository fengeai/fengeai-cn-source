export interface ReferenceMaterial {
  title: string;
  account: string;
  summary: string;
  url: string;
  content: string;
}

const requestHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7',
};

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
      .replace(/<\/p>|<\/div>|<\/section>|<\/h[1-6]>|<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\n\s+/g, '\n')
    .trim();
}

function parseReferenceLines(summary: string): ReferenceMaterial[] {
  return summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .map((line) => {
      const clean = line.replace(/^\d+\.\s*/, '');
      const parts = clean.split('｜');
      const title = parts[0]?.trim() || '';
      const account = parts[1]?.trim() || '公开文章';
      const url = parts.find((part) => /^https?:\/\//i.test(part.trim()))?.trim() || '';
      const summaryText = parts
        .slice(2)
        .filter((part) => !/^https?:\/\//i.test(part.trim()))
        .join('｜')
        .trim();

      return {
        title,
        account,
        summary: summaryText,
        url,
        content: '',
      };
    })
    .filter((item) => item.title || item.summary || item.url)
    .slice(0, 5);
}

function extractArticleText(html: string): string {
  const contentMatch = html.match(/<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<script/i)
    || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return stripTags(contentMatch?.[1] || '').slice(0, 2600);
}

async function fetchArticleText(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    return '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });

    if (!response.ok) {
      return '';
    }

    return extractArticleText(await response.text());
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

export async function readReferenceMaterials(topicSummary: string): Promise<ReferenceMaterial[]> {
  const references = parseReferenceLines(topicSummary);
  if (references.length === 0) {
    return [];
  }

  // Set a hard deadline for all fetches combined (15 seconds max)
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), 15_000);

  try {
    const results = await Promise.all(
      references.slice(0, 3).map(async (reference) => {
        try {
          const content = await fetchArticleText(reference.url);
          return { ...reference, content };
        } catch {
          return { ...reference, content: '' };
        }
      }),
    );

    clearTimeout(deadlineTimer);
    return results;
  } catch {
    clearTimeout(deadlineTimer);
    // If the deadline fires, return references without fetched content
    return references.slice(0, 3).map((reference) => ({ ...reference, content: '' }));
  }
}

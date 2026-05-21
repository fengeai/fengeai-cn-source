import type {
  Article,
  HotSearchResponse,
  ReferenceInsightsResponse,
  ReferenceInsightsRevisionResponse,
  Topic,
} from '@content-assistant/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3100';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(data?.message || data?.error || `请求失败：${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchTopics(): Promise<Topic[]> {
  const response = await fetch(`${API_BASE_URL}/api/topics`);
  const data = await parseJson<{ items: Topic[] }>(response);
  return data.items;
}

export async function fetchArticles(): Promise<Article[]> {
  const response = await fetch(`${API_BASE_URL}/api/articles`);
  const data = await parseJson<{ items: Article[] }>(response);
  return data.items;
}

export async function fetchArticle(id: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/api/articles/${id}`);
  return parseJson<Article>(response);
}

export async function searchHotTopics(keyword: string): Promise<HotSearchResponse> {
  const params = new URLSearchParams({ keyword });
  const response = await fetch(`${API_BASE_URL}/api/hot-search?${params.toString()}`);
  return parseJson<HotSearchResponse>(response);
}

export async function createTopic(input: {
  title: string;
  summary: string;
  audience: string;
  angle: string;
  keywords: string[];
}): Promise<Topic> {
  const response = await fetch(`${API_BASE_URL}/api/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson<Topic>(response);
}

export async function selectTopic(id: string): Promise<Topic> {
  const response = await fetch(`${API_BASE_URL}/api/topics/${id}/select`, {
    method: 'POST',
  });

  return parseJson<Topic>(response);
}

export async function generateReferenceInsights(topicId: string): Promise<ReferenceInsightsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/articles/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topicId }),
  });

  return parseJson<ReferenceInsightsResponse>(response);
}

export async function reviseReferenceInsights(input: {
  topicId: string;
  currentInsights: string;
  instruction: string;
}): Promise<ReferenceInsightsRevisionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/articles/insights/revise`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson<ReferenceInsightsRevisionResponse>(response);
}

export async function generateArticle(topicId: string, referenceInsights?: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/api/articles/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topicId, referenceInsights }),
  });

  return parseJson<Article>(response);
}

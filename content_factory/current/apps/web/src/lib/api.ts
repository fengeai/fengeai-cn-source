import type {
  Article,
  HotSearchResponse,
  ReferenceInsightsResponse,
  ReferenceInsightsRevisionResponse,
  Topic,
} from '@content-assistant/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3100';
const ACCESS_CODE_KEY = 'fenge_content_factory_access_code';

function getAccessCode() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(ACCESS_CODE_KEY) || '';
}

function jsonHeaders() {
  const code = getAccessCode();

  return {
    'Content-Type': 'application/json',
    ...(code ? { 'X-Content-Factory-Code': code } : {}),
  };
}

export function getStoredAccessCode() {
  return getAccessCode();
}

export function saveAccessCode(code: string) {
  window.localStorage.setItem(ACCESS_CODE_KEY, code.trim());
}

export function clearAccessCode() {
  window.localStorage.removeItem(ACCESS_CODE_KEY);
}

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

export async function fetchAccessStatus(): Promise<{ enabled: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/access/status`);
  return parseJson<{ enabled: boolean }>(response);
}

export async function verifyAccessCode(code: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/access/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  return parseJson<{ ok: boolean }>(response);
}

export async function searchHotTopics(keyword: string): Promise<HotSearchResponse> {
  const params = new URLSearchParams({ keyword });
  const code = getAccessCode();
  const response = await fetch(`${API_BASE_URL}/api/hot-search?${params.toString()}`, {
    headers: code ? { 'X-Content-Factory-Code': code } : {},
  });
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
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });

  return parseJson<Topic>(response);
}

export async function selectTopic(id: string): Promise<Topic> {
  const response = await fetch(`${API_BASE_URL}/api/topics/${id}/select`, {
    method: 'POST',
    headers: getAccessCode() ? { 'X-Content-Factory-Code': getAccessCode() } : {},
  });

  return parseJson<Topic>(response);
}

export async function generateReferenceInsights(topicId: string): Promise<ReferenceInsightsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/articles/insights`, {
    method: 'POST',
    headers: jsonHeaders(),
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
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });

  return parseJson<ReferenceInsightsRevisionResponse>(response);
}

export async function generateArticle(topicId: string, referenceInsights?: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/api/articles/generate`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ topicId, referenceInsights }),
  });

  return parseJson<Article>(response);
}

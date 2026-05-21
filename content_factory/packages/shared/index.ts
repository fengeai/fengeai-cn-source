export type TopicStatus = 'draft' | 'selected' | 'in_progress' | 'archived';

export type ArticleStatus = 'draft' | 'reviewing' | 'approved';

export type Platform = 'wechat' | 'xhs' | 'zhihu';

export interface Topic {
  id: string;
  title: string;
  summary: string;
  audience: string;
  angle: string;
  keywords: string[];
  status: TopicStatus;
  createdAt: string;
}

export interface HotSearchResult {
  id: string;
  title: string;
  account: string;
  summary: string;
  angle: string;
  score: number;
  heat: string;
  publishTime: string;
  source: string;
  url: string;
}

export interface HotSearchResponse {
  keyword: string;
  results: HotSearchResult[];
}

export interface ContentBrief {
  hook: string;
  promise: string;
  keyPoints: string[];
  callToAction: string;
}

export interface ArticleVariant {
  id: string;
  platform: Platform;
  title: string;
  content: string;
}

export interface Article {
  id: string;
  topicId: string;
  title: string;
  status: ArticleStatus;
  outline: string[];
  brief: ContentBrief;
  content: string;
  referenceInsights?: string;
  variants: ArticleVariant[];
  createdAt: string;
}

export interface ReferenceInsightsResponse {
  topicId: string;
  referenceInsights: string;
}

export interface ReferenceInsightsRevisionResponse {
  referenceInsights: string;
}

import getConfig from "next/config";

// 运行时获取 API base URL
// 浏览器环境：使用空字符串，让 Next.js rewrites 代理
// 服务端渲染：直接访问后端
export function getAPIBase(): string {
  if (typeof window !== "undefined") {
    // 浏览器：使用相对路径
    return "";
  }
  // 服务端：直接访问后端
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";
}

export const API_BASE = getAPIBase();

export interface NewsArticle {
  id: number;
  title: string;
  source: string;
  url: string;
  content: string;
  publish_date: string | null;
  crawled_at: string;
  summary: string;
  category: string;
  keywords: string[];
  sentiment: string;
  importance_score: number;
  ai_analysis: string;
}

export interface NewsListResponse {
  total: number;
  page: number;
  page_size: number;
  articles: NewsArticle[];
}

export interface DashboardStats {
  total_articles: number;
  category_distribution: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  daily_trend: { date: string; count: number }[];
  top_keywords: { keyword: string; count: number }[];
  date_range: { start: string; end: string };
}

export async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// 调度器相关类型
export interface SchedulerStatus {
  running: boolean;
  enabled: boolean;
  interval_minutes: number;
  cron_expression: string;
  next_run_time: string | null;
  last_crawl_time: string | null;
  focus_keywords: string[];
  focus_categories: string[];
  sources: Record<string, boolean>;
}

export interface CrawlHistory {
  id: number;
  timestamp: string;
  status: string;
  crawled: number;
  saved: number;
  new_articles: number;
  sources: string[];
  message: string;
}

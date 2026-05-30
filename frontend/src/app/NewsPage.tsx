"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE, type NewsListResponse, type DashboardStats, type NewsArticle } from "@/lib/api";

const CATEGORIES = ["全部", "公司动态", "产品技术", "合作生态", "市场拓展", "荣誉奖项", "财务投资", "人才文化", "其他"];
const SENTIMENTS = ["全部", "正面", "中性", "负面"];

export default function NewsPage() {
  const searchParams = useSearchParams();

  const [data, setData] = useState<NewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("cat") || "全部");
  const [sentiment, setSentiment] = useState(searchParams.get("sent") || "全部");
  const [page, setPage] = useState(Number(searchParams.get("p") || 1));
  const [crawling, setCrawling] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    loadNews();
  }, [page, category, sentiment]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadNews() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (keyword) params.set("keyword", keyword);
      if (category !== "全部") params.set("category", category);
      if (sentiment !== "全部") params.set("sentiment", sentiment);
      const res = await fetch(`${API_BASE}/api/news?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load news:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      const json = await res.json();
      setStats(json);
    } catch {}
  }

  async function triggerCrawl() {
    setCrawling(true);
    try {
      const res = await fetch(`${API_BASE}/api/crawl`, { method: "POST" });
      const json = await res.json();
      alert(json.message || "采集完成");
      loadNews();
      loadStats();
    } catch (e) {
      alert("采集失败: " + String(e));
    } finally {
      setCrawling(false);
    }
  }

  function handleSearch() {
    setPage(1);
    loadNews();
  }

  const sentimentColor: Record<string, string> = {
    "正面": "bg-green-100 text-green-700",
    "中性": "bg-gray-100 text-gray-600",
    "负面": "bg-red-100 text-red-700",
  };

  const categoryColor: Record<string, string> = {
    "公司动态": "bg-blue-100 text-blue-700",
    "产品技术": "bg-purple-100 text-purple-700",
    "合作生态": "bg-teal-100 text-teal-700",
    "市场拓展": "bg-orange-100 text-orange-700",
    "荣誉奖项": "bg-yellow-100 text-yellow-700",
    "财务投资": "bg-emerald-100 text-emerald-700",
    "人才文化": "bg-pink-100 text-pink-700",
    "其他": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 顶部统计条 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.total_articles}</div>
            <div className="text-sm text-gray-500">新闻总数</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {stats.total_articles > 0
                ? Math.round(((stats.sentiment_distribution["正面"] || 0) / stats.total_articles) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-500">正面新闻占比</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats.category_distribution).length}
            </div>
            <div className="text-sm text-gray-500">新闻分类</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-sm font-bold text-orange-600 leading-relaxed">
              {stats.top_keywords.slice(0, 5).map(k => k.keyword).join("、") || "—"}
            </div>
            <div className="text-sm text-gray-500">热门关键词</div>
          </div>
        </div>
      )}

      {/* 搜索和筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索新闻标题、内容..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
          </div>
          <button
            onClick={triggerCrawl}
            disabled={crawling}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {crawling ? "采集中..." : "🔄 采集最新新闻"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">分类：</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-500">情感：</span>
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                onClick={() => { setSentiment(s); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sentiment === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 新闻列表 */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : data && data.articles.length > 0 ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-500 mb-2">共 {data.total} 篇新闻，第 {data.page} 页</div>
          {data.articles.map((article) => (
            <div
              key={article.id}
              className="news-card bg-white rounded-xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedArticle(article)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                  {article.summary && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                      <span className="text-blue-500 font-medium">AI摘要：</span>{article.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`tag ${categoryColor[article.category] || "bg-gray-100 text-gray-600"}`}>
                      {article.category}
                    </span>
                    <span className={`tag ${sentimentColor[article.sentiment] || "bg-gray-100 text-gray-600"}`}>
                      {article.sentiment}
                    </span>
                    {article.keywords?.slice(0, 3).map((kw, i) => (
                      <span key={i} className="tag bg-blue-50 text-blue-600">#{kw}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400 mb-1">{article.publish_date || "日期未知"}</div>
                  <div className="text-xs text-gray-400">{article.source}</div>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-gray-400">重要性</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(article.importance_score || 0.5) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 分页 */}
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">上一页</button>
            <span className="px-4 py-2 text-sm text-gray-500">{page} / {Math.ceil((data?.total || 0) / 20)}</span>
            <button onClick={() => setPage(page + 1)} disabled={data ? page * 20 >= data.total : true}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">下一页</button>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无新闻数据</h3>
          <p className="text-sm text-gray-500 mb-4">点击「采集最新新闻」按钮开始采集</p>
          <button onClick={triggerCrawl} disabled={crawling}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {crawling ? "采集中..." : "开始采集"}
          </button>
        </div>
      )}

      {/* 新闻详情弹窗 */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedArticle(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{selectedArticle.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{selectedArticle.source}</span>
                  <span>{selectedArticle.publish_date}</span>
                  <span className={`tag ${categoryColor[selectedArticle.category] || "bg-gray-100 text-gray-600"}`}>
                    {selectedArticle.category}
                  </span>
                  <span className={`tag ${sentimentColor[selectedArticle.sentiment] || "bg-gray-100 text-gray-600"}`}>
                    {selectedArticle.sentiment}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg"
              >
                ×
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-5 space-y-5">
              {/* AI摘要 */}
              {selectedArticle.summary && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🤖</span>
                    <span className="text-sm font-medium text-blue-700">AI摘要</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedArticle.summary}</p>
                </div>
              )}

              {/* 新闻全文 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">新闻内容</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{selectedArticle.content}</p>
              </div>

              {/* 关键词 */}
              {selectedArticle.keywords && selectedArticle.keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">关键词</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.keywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 重要性评分 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">重要性评分</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                      style={{ width: `${(selectedArticle.importance_score || 0.5) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-blue-600">{(selectedArticle.importance_score || 0.5).toFixed(1)}</span>
                </div>
              </div>

              {/* 来源链接 */}
              {selectedArticle.url && (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  🔗 查看原文
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
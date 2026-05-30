"use client";

import { useState, useEffect, useCallback } from "react";
import { ToastContainer, useToast } from "@/components/Toast";
import { NewsDrawer } from "@/components/NewsDrawer";
import { getCategoryStyle, getSentimentStyle } from "@/lib/categories";
import { SkeletonList } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { CrawlProgressModal } from "@/components/CrawlProgressModal";

import { API_BASE as API } from "@/lib/api";
const ALL_CATEGORIES = ["公司动态", "产品技术", "合作生态", "市场拓展", "荣誉奖项", "财务投资", "人才文化", "其他"];
const SENTIMENTS = ["正面", "中性", "负面"];

interface Article {
  id: number; title: string; summary: string; content: string;
  source: string; url: string; publish_date: string; category: string;
  sentiment: string; keywords: string[]; importance_score: number;
  ai_analysis: string; crawled_at: string;
}

interface FilterState {
  keyword: string;
  category: string;
  sentiment: string;
  dateFrom: string;
  dateTo: string;
  importanceMin: number;
  importanceMax: number;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Article | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const { toasts, success, error, removeToast } = useToast();
  
  // 进度弹框状态
  const [showProgress, setShowProgress] = useState(false);
  const [crawlMode, setCrawlMode] = useState<string>("incremental");
  const [progress, setProgress] = useState<{
    event: string;
    step?: string;
    message: string;
    count?: number;
    sources?: string[];
    elapsed?: number;
    crawled?: number;
    saved?: number;
  }>({ event: "start", message: "准备中..." });
  
  const [filters, setFilters] = useState<FilterState>({
    keyword: "",
    category: "",
    sentiment: "",
    dateFrom: "",
    dateTo: "",
    importanceMin: 1,
    importanceMax: 10,
  });

  // 数据抓取函数（带模拟进度）
  const handleCrawl = async (mode: 'full' | 'incremental' | 'preset') => {
    setCrawling(true);
    setCrawlMode(mode);
    setShowProgress(true);
    setProgress({ event: "start", message: "准备中..." });
    
    // 模拟进度更新
    const progressSteps = [
      { step: "clear", message: "清空数据库...", delay: 100 },
      { step: "crawl", message: "正在抓取数据...", delay: 300 },
      { step: "crawled", message: "抓取完成", delay: 500 },
      { step: "save", message: "保存数据...", delay: 700 },
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress({ 
          event: "progress", 
          step: progressSteps[stepIndex].step, 
          message: progressSteps[stepIndex].message 
        });
        stepIndex++;
      }
    }, 200);
    
    try {
      let res;
      if (mode === 'preset') {
        res = await fetch(`${API}/api/crawl/preset`, { method: 'POST' });
      } else {
        res = await fetch(`${API}/api/crawl`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
      }
      
      clearInterval(progressInterval);
      const data = await res.json();
      
      if (res.ok) {
        setProgress({ 
          event: "done", 
          saved: data.saved || data.count || 0,
          crawled: data.crawled || 0,
          elapsed: 0,
          message: `完成！保存 ${data.saved || data.count || 0} 篇文章`
        });
        success(`抓取完成：新增 ${data.saved || data.count || 0} 条新闻`);
        load(); // 刷新列表
      } else {
        setProgress({ event: "error", message: data.detail || '抓取失败' });
        error(data.detail || '抓取失败');
      }
    } catch (e) {
      clearInterval(progressInterval);
      setProgress({ event: "error", message: "请求失败，请重试" });
      error('抓取请求失败');
    } finally {
      setCrawling(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: page.toString(), 
        page_size: "20", 
        sort_by: "publish_date", 
        sort_order: "desc" 
      });
      if (filters.category) params.set("category", filters.category);
      if (filters.keyword) params.set("keyword", filters.keyword);
      if (filters.sentiment) params.set("sentiment", filters.sentiment);
      
      const res = await fetch(`${API}/api/news?${params}`);
      if (res.ok) { 
        const d = await res.json(); 
        setArticles(d.articles || []); 
        setTotal(d.total || 0); 
      }
    } catch (e) {
      console.error(e);
    }
    finally { setLoading(false); }
  }, [page, filters.category, filters.keyword, filters.sentiment]);

  useEffect(() => { load(); }, [load]);

  const search = () => { 
    setPage(1); 
    load(); 
  };

  const clearFilters = () => {
    setFilters({
      keyword: "",
      category: "",
      sentiment: "",
      dateFrom: "",
      dateTo: "",
      importanceMin: 1,
      importanceMax: 10,
    });
    setPage(1);
    success("已清空筛选条件");
  };

  const hasActiveFilters = filters.category || filters.sentiment || filters.keyword;

  const totalPages = Math.ceil(total / 20);

  const handleArticleClick = (article: Article) => {
    setSelected(article);
  };

  const handlePrevious = () => {
    const currentIndex = articles.findIndex(a => a.id === selected?.id);
    if (currentIndex > 0) {
      setSelected(articles[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = articles.findIndex(a => a.id === selected?.id);
    if (currentIndex < articles.length - 1) {
      setSelected(articles[currentIndex + 1]);
    }
  };

  const importanceColor = (score: number) => {
    if (score >= 8) return "from-rose-500 to-orange-500";
    if (score >= 6) return "from-amber-500 to-yellow-500";
    if (score >= 4) return "from-blue-500 to-cyan-500";
    return "from-slate-500 to-gray-500";
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">软通新闻智能平台</h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {total} 条新闻 · 智能分类 · 情感分析 · 词云可视化
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 数据获取按钮组 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCrawl('incremental')}
              disabled={crawling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {crawling ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
              增量抓取
            </button>
            <button
              onClick={() => handleCrawl('full')}
              disabled={crawling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {crawling ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              全量抓取
            </button>
            <button
              onClick={() => handleCrawl('preset')}
              disabled={crawling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {crawling ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              )}
              预置数据
            </button>
          </div>
          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            筛选
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        {/* 基础筛选 */}
        <div className="flex flex-wrap gap-3 items-center">
          <input 
            className="input flex-1 min-w-[200px]" 
            value={filters.keyword} 
            onChange={e => setFilters({ ...filters, keyword: e.target.value })} 
            onKeyDown={e => e.key === "Enter" && search()} 
            placeholder="搜索关键词..." 
          />
          <select 
            className="input w-auto" 
            value={filters.category} 
            onChange={e => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
          >
            <option value="">全分类</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="input w-auto" 
            value={filters.sentiment} 
            onChange={e => { setFilters({ ...filters, sentiment: e.target.value }); setPage(1); }}
          >
            <option value="">全情感</option>
            {SENTIMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={search} className="btn-primary">
            搜索
          </button>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {/* 高级筛选 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">开始日期</label>
              <input 
                type="date"
                className="input w-full" 
                value={filters.dateFrom} 
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">结束日期</label>
              <input 
                type="date"
                className="input w-full" 
                value={filters.dateTo} 
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">重要性分数：{filters.importanceMin} - {filters.importanceMax}</label>
              <input 
                type="range"
                min="1"
                max="10"
                value={filters.importanceMin}
                onChange={e => setFilters({ ...filters, importanceMin: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      {loading ? (
        <SkeletonList />
      ) : articles.length === 0 ? (
        <EmptyState 
          type={hasActiveFilters ? "no-results" : "no-data"} 
          onReset={clearFilters} 
        />
      ) : (
        <>
          {/* 新闻列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map(article => {
              const catStyle = getCategoryStyle(article.category);
              const sentStyle = getSentimentStyle(article.sentiment);
              
              return (
                <div 
                  key={article.id}
                  className="card-hover card p-5 cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  {/* 分类标签 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${catStyle.bgColor} ${catStyle.textColor}`}>
                      {catStyle.icon}
                      {article.category}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sentStyle.bgColor} ${sentStyle.color}`}>
                      {article.sentiment}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-base font-semibold text-slate-100 mb-2 line-clamp-2">
                    {article.title}
                  </h3>

                  {/* 摘要 */}
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {article.summary || article.content?.slice(0, 100)}
                  </p>

                  {/* 关键词 */}
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {article.keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 底部元数据 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{article.source}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {new Date(article.publish_date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${importanceColor(article.importance_score)} text-white`}>
                      重要性 {article.importance_score}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-slate-400 px-4">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
      
      {/* 侧边抽屉 */}
      <NewsDrawer
        article={selected}
        onClose={() => setSelected(null)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={selected ? articles.findIndex(a => a.id === selected.id) > 0 : false}
        hasNext={selected ? articles.findIndex(a => a.id === selected.id) < articles.length - 1 : false}
      />
      
      {/* 抓取进度弹框 */}
      <CrawlProgressModal
        isOpen={showProgress}
        mode={crawlMode}
        progress={progress}
        onClose={() => setShowProgress(false)}
      />
    </div>
  );
}

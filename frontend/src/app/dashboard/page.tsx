"use client";
import { useState, useEffect } from "react";

import { API_BASE as API } from "@/lib/api";

interface Stats {
  total_articles: number; new_today: number; categories: Record<string, number>;
  sentiments: Record<string, number>; avg_importance: number;
  top_keywords: { keyword: string; count: number }[];
}

const categoryColors: Record<string, string> = {
  "产品技术": "from-blue-500 to-cyan-500",
  "合作生态": "from-emerald-500 to-teal-500",
  "市场拓展": "from-amber-500 to-orange-500",
  "财务投资": "from-purple-500 to-pink-500",
  "荣誉奖项": "from-teal-500 to-cyan-500",
  "公司动态": "from-indigo-500 to-blue-500",
  "人才文化": "from-pink-500 to-rose-500",
  "其他": "from-slate-500 to-gray-500",
};

const categoryBgColors: Record<string, string> = {
  "产品技术": "bg-blue-500",
  "合作生态": "bg-emerald-500",
  "市场拓展": "bg-amber-500",
  "财务投资": "bg-purple-500",
  "荣誉奖项": "bg-teal-500",
  "公司动态": "bg-indigo-500",
  "人才文化": "bg-pink-500",
  "其他": "bg-slate-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/dashboard`);
        if (res.ok) {
          const data = await res.json();
          // 适配后端数据格式
          setStats({
            total_articles: data.total_articles || 0,
            new_today: data.new_today || 0,
            categories: data.category_distribution || {},
            sentiments: data.sentiment_distribution || {},
            avg_importance: data.avg_importance || 0.5,
            top_keywords: data.top_keywords || [],
          });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!stats) return (
    <div className="card p-16 text-center">
      <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
      <p className="text-slate-400">加载失败，请刷新重试</p>
    </div>
  );

  const maxCat = Math.max(...Object.values(stats.categories || {}), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">数据仪表盘</h1>
        <p className="text-sm text-slate-400 mt-1">新闻数据全景概览 · 实时统计</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: "总新闻数", 
            value: stats.total_articles, 
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            ),
            gradient: "from-blue-600 via-blue-700 to-indigo-800",
            glow: "shadow-blue-500/30"
          },
          { 
            label: "今日新增", 
            value: stats.new_today, 
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            ),
            gradient: "from-emerald-600 via-emerald-700 to-teal-800",
            glow: "shadow-emerald-500/30"
          },
          { 
            label: "平均重要性", 
            value: stats.avg_importance?.toFixed(1) || "-", 
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ),
            gradient: "from-amber-600 via-amber-700 to-orange-800",
            glow: "shadow-amber-500/30"
          },
          { 
            label: "分类覆盖", 
            value: Object.keys(stats.categories || {}).length, 
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            gradient: "from-purple-600 via-purple-700 to-pink-800",
            glow: "shadow-purple-500/30"
          },
        ].map((s, i) => (
          <div 
            key={s.label} 
            className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 shadow-xl ${s.glow} transition-all duration-300 hover:scale-105`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/90">{s.icon}</div>
              <div className="text-3xl font-bold text-white">{s.value}</div>
            </div>
            <div className="text-sm text-white/70 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Distribution - 柱状图 */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            分类分布
          </h3>
          <div className="relative">
            {/* Y轴刻度 */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-slate-500">
              <span>{maxCat}</span>
              <span>{Math.round(maxCat * 0.75)}</span>
              <span>{Math.round(maxCat * 0.5)}</span>
              <span>{Math.round(maxCat * 0.25)}</span>
              <span>0</span>
            </div>
            {/* 图表区域 */}
            <div className="ml-10">
              {/* 网格线 */}
              <div className="absolute left-10 right-0 top-0 h-40 flex flex-col justify-between pointer-events-none">
                {[0, 25, 50, 75, 100].map(pct => (
                  <div key={pct} className="border-t border-slate-700/30" />
                ))}
              </div>
              {/* 柱状图 */}
              <div className="flex items-end gap-3 h-40 mb-2">
                {Object.entries(stats.categories || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([cat, count], i) => {
                    const height = maxCat > 0 ? (count / maxCat) * 100 : 0;
                    return (
                      <div key={cat} className="flex-1 flex flex-col items-center group h-full">
                        {/* 数值标签 - 始终显示 */}
                        <div className="text-sm font-bold text-white mb-1 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {count}
                        </div>
                        {/* 柱子容器 - 占据剩余高度 */}
                        <div className="relative w-full flex-1 min-h-[8px]">
                          <div 
                            className={`absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t ${categoryColors[cat] || "from-slate-500 to-gray-500"} transition-all duration-500 ease-out group-hover:shadow-lg cursor-default overflow-hidden`}
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          >
                            {/* 光泽效果 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent" />
                          </div>
                        </div>
                        {/* 分类名 */}
                        <span className="text-xs text-slate-400 text-center truncate w-full mt-2 flex-shrink-0">{cat}</span>
                      </div>
                    );
                  })}
              </div>
              {/* X轴 */}
              <div className="border-t border-slate-700/50" />
            </div>
          </div>
        </div>

        {/* Sentiment Distribution - 环形图 */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            情感分布
          </h3>
          <div className="flex items-center gap-6">
            {/* 环形图 */}
            <div className="relative w-44 h-44 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  const total = stats.total_articles || 1;
                  const sentiments = stats.sentiments || {};
                  const segments = [
                    { key: "正面", color: "#10b981", count: sentiments["正面"] || 0 },
                    { key: "中性", color: "#f59e0b", count: sentiments["中性"] || 0 },
                    { key: "负面", color: "#f43f5e", count: sentiments["负面"] || 0 },
                  ];
                  let offset = 0;
                  return segments.map(seg => {
                    const pct = (seg.count / total) * 100;
                    const dash = (pct / 100) * 251;
                    const circle = (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={`${dash} ${251 - dash}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-700"
                        strokeLinecap="round"
                      />
                    );
                    offset += dash;
                    return circle;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{stats.total_articles}</span>
                <span className="text-xs text-slate-400 mt-1">总新闻</span>
              </div>
            </div>
            {/* 图例 */}
            <div className="flex-1 space-y-4">
              {Object.entries(stats.sentiments || {}).map(([s, count]) => {
                const pct = stats.total_articles ? Math.round((count / stats.total_articles) * 100) : 0;
                const colorMap: Record<string, { bg: string; text: string; border: string }> = { 
                  正面: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500" }, 
                  中性: { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500" }, 
                  负面: { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500" } 
                };
                const c = colorMap[s] || { bg: "bg-slate-500", text: "text-slate-400", border: "border-slate-500" };
                return (
                  <div key={s} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                        <span className="text-sm text-slate-300">{s}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{count}篇</span>
                        <span className={`text-sm font-bold ${c.text}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top Keywords - 词云 */}
      {stats.top_keywords && stats.top_keywords.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            热门关键词
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            {stats.top_keywords.map((kw, i) => {
              const maxCount = stats.top_keywords[0]?.count || 1;
              const ratio = kw.count / maxCount;
              const size = 0.875 + ratio * 0.875;
              // 多色系：前3蓝系，中3紫系，后4绿/橙系
              const colorSchemes = [
                "from-blue-500 to-cyan-500",
                "from-blue-400 to-indigo-500",
                "from-indigo-500 to-purple-500",
                "from-purple-500 to-violet-500",
                "from-violet-500 to-fuchsia-500",
                "from-fuchsia-500 to-pink-500",
                "from-emerald-500 to-teal-500",
                "from-teal-500 to-cyan-500",
                "from-amber-500 to-orange-500",
                "from-orange-500 to-red-500",
              ];
              const gradient = colorSchemes[i % colorSchemes.length];
              return (
                <span 
                  key={kw.keyword} 
                  className="relative inline-flex items-center px-3 py-1.5 rounded-full cursor-default transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
                  style={{ 
                    fontSize: `${size}rem`,
                    animationDelay: `${i * 0.05}s`
                  }}
                >
                  <span className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-80`} />
                  <span className="relative font-medium text-white">{kw.keyword}</span>
                  <span className="relative ml-1.5 text-xs text-white/60 font-bold">{kw.count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

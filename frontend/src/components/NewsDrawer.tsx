"use client";

import { useEffect, useCallback } from "react";
import { getCategoryStyle, getSentimentStyle } from "@/lib/categories";

interface Article {
  id: number;
  title: string;
  summary: string;
  content: string;
  source: string;
  url: string;
  publish_date: string;
  category: string;
  sentiment: string;
  keywords: string[];
  importance_score: number;
  ai_analysis: string;
  crawled_at: string;
}

interface NewsDrawerProps {
  article: Article | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function NewsDrawer({ 
  article, 
  onClose, 
  onPrevious, 
  onNext,
  hasPrevious = false,
  hasNext = false 
}: NewsDrawerProps) {
  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrevious && onPrevious) onPrevious();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    };
    
    if (article) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [article, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!article) return null;

  const categoryStyle = getCategoryStyle(article.category);
  const sentimentStyle = getSentimentStyle(article.sentiment);

  const importanceColor = (score: number) => {
    if (score >= 8) return "from-rose-500 to-orange-500";
    if (score >= 6) return "from-amber-500 to-yellow-500";
    if (score >= 4) return "from-blue-500 to-cyan-500";
    return "from-slate-500 to-gray-500";
  };

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* 抽屉容器 */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-l border-slate-600 shadow-2xl z-[70] overflow-hidden flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-700/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white leading-snug mb-3">
                {article.title}
              </h2>
              
              {/* 元数据 */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 分类 */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${categoryStyle.bgColor} ${categoryStyle.textColor} border ${categoryStyle.borderColor}`}>
                  {categoryStyle.icon}
                  {article.category}
                </span>
                
                {/* 情感 */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${sentimentStyle.bgColor} ${sentimentStyle.color} border ${sentimentStyle.borderColor}`}>
                  {sentimentStyle.icon}
                  {article.sentiment}
                </span>
                
                {/* 重要性 */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r ${importanceColor(article.importance_score)}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {article.importance_score}/10
                </span>
                
                {/* 来源 */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-700/50 text-slate-300 border border-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.754-1.754m13.35-.622l1.754-1.754a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  {article.source}
                </span>
                
                {/* 日期 */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-700/50 text-slate-300 border border-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {article.publish_date}
                </span>
              </div>
            </div>
            
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 导航按钮 */}
          {(hasPrevious || hasNext) && (
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                上一篇
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
              >
                下一篇
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 关键词 */}
          {article.keywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                关键词
              </h4>
              <div className="flex flex-wrap gap-2">
                {article.keywords.map((kw) => (
                  <span 
                    key={kw} 
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryStyle.bgColor} ${categoryStyle.textColor} border ${categoryStyle.borderColor} hover:scale-105 transition-transform cursor-default`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 新闻内容 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              新闻正文
            </h4>
            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {article.content}
              </p>
            </div>
          </div>
          
          {/* AI 分析 */}
          {article.ai_analysis && (
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                AI 智能分析
              </h4>
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-5 border border-blue-500/30">
                <p className="text-sm text-slate-200 leading-relaxed">
                  {article.ai_analysis}
                </p>
              </div>
            </div>
          )}
          
          {/* 原文链接 */}
          <div className="pt-4 border-t border-slate-700/50">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              查看原文链接
            </a>
          </div>
        </div>
        
        {/* 底部操作栏 */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

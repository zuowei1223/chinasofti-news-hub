"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { API_BASE as API } from "@/lib/api";

interface Report {
  id: number;
  title: string;
  content: string;
  article_count: number;
  new_this_week: number;
  week_start?: string;
  week_end?: string;
  generated_at: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reports/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyReport = () => {
    if (report?.content) {
      navigator.clipboard.writeText(report.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 结构化渲染周报内容
  const renderStructuredContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="space-y-2 my-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-emerald-400 mt-1.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 空行
      if (!trimmedLine) {
        flushList();
        return;
      }
      
      // 标题检测（## 或 ### 或中文数字标题）
      if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
        flushList();
        const titleText = trimmedLine.replace(/^#+\s*/, '');
        const isH2 = trimmedLine.startsWith('## ');
        elements.push(
          <h3 
            key={index} 
            className={`font-semibold text-white mt-6 mb-3 pb-2 border-b border-slate-700/50 ${isH2 ? 'text-lg' : 'text-base'}`}
          >
            {titleText}
          </h3>
        );
        return;
      }

      // 中文数字标题检测（一、二、三、等）
      if (/^[一二三四五六七八九十]+、/.test(trimmedLine)) {
        flushList();
        elements.push(
          <h4 key={index} className="font-semibold text-white mt-5 mb-3 text-base flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></span>
            {trimmedLine}
          </h4>
        );
        return;
      }

      // 数字编号标题（1. 2. 3. 等，且后面内容较短）
      if (/^\d+\.\s+/.test(trimmedLine) && trimmedLine.length < 30) {
        flushList();
        elements.push(
          <h5 key={index} className="font-medium text-slate-200 mt-4 mb-2 text-sm">
            {trimmedLine}
          </h5>
        );
        return;
      }

      // 列表项检测（- 或 * 或数字.）
      if (/^[-*]\s+/.test(trimmedLine) || /^\d+\.\s+/.test(trimmedLine)) {
        const itemText = trimmedLine.replace(/^[-*\d.]\s*/, '');
        currentList.push(itemText);
        return;
      }

      // 普通段落
      flushList();
      elements.push(
        <p key={index} className="text-slate-300 leading-relaxed my-3">
          {trimmedLine}
        </p>
      );
    });

    flushList();
    return elements;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">加载周报...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-slate-400">周报不存在或已删除</p>
        <button 
          onClick={() => router.push('/report')}
          className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600/50 transition-all"
        >
          返回周报列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/report')}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{report.title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date(report.generated_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
            <span className="text-slate-500">分析文章</span>
            <span className="ml-2 font-medium text-slate-200">{report.article_count} 篇</span>
          </div>
          {report.new_this_week > 0 && (
            <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-xs">
              <span className="text-emerald-400">本周新增 {report.new_this_week}</span>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      {(report.week_start || report.week_end) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">周期起始</p>
            <p className="text-sm font-medium text-slate-200">{report.week_start || '-'}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">周期结束</p>
            <p className="text-sm font-medium text-slate-200">{report.week_end || '-'}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">周报ID</p>
            <p className="text-sm font-medium text-slate-200">#{report.id}</p>
          </div>
        </div>
      )}

      {/* 周报内容 - 结构化渲染 */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
          <h3 className="text-base font-semibold text-white">周报内容</h3>
          <button
            onClick={copyReport}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              copied 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50"
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                已复制
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                复制周报
              </>
            )}
          </button>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none">
          {renderStructuredContent(report.content)}
        </div>
      </div>
    </div>
  );
}
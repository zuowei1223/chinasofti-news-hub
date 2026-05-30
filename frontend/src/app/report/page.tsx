"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Report[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/api/reports`);
      const data = await res.json();
      setHistory(data.reports || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 加载历史周报
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/report`, { method: "POST" });
      const data = await res.json();
      setReport(data);
      // 刷新历史列表
      loadHistory();
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    if (report?.content) {
      navigator.clipboard.writeText(report.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const viewReport = (id: number) => {
    router.push(`/report/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">新闻周报生成</h2>
          <p className="text-sm text-slate-400">AI 自动分析新闻，生成结构化周报</p>
        </div>
      </div>

      {/* 生成周报区域 */}
      {!report && !loading && (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-200 mb-2">一键生成新闻周报</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            AI 将综合分析近30天所有新闻，生成包含重大事件、业务动态、趋势研判的专业周报
          </p>
          <button
            onClick={generateReport}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            生成周报
          </button>
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-1">正在生成周报...</h3>
              <p className="text-sm text-slate-500">AI 正在分析新闻内容</p>
            </div>
          </div>
        </div>
      )}

      {/* 最新生成的周报 */}
      {report && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <span className="text-xs text-slate-500">分析文章</span>
              <span className="ml-2 text-sm font-medium text-slate-200">{report.article_count} 篇</span>
            </div>
            <div className="px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-xs text-green-400">生成完成</span>
            </div>
            <button
              onClick={() => viewReport(report.id)}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-all"
            >
              查看详情页
            </button>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
              <h3 className="text-base font-semibold text-slate-100">周报内容</h3>
              <div className="flex items-center gap-2">
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
                      复制
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setReport(null); }}
                  className="px-4 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg text-sm font-medium hover:bg-slate-700/50 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  重新生成
                </button>
              </div>
            </div>
            <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
              {report.content}
            </div>
          </div>
        </div>
      )}

      {/* 历史周报列表 */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 6.75a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          历史周报
        </h3>
        
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>暂无历史周报</p>
            <p className="text-sm mt-1">点击上方&ldquo;生成周报&rdquo;按钮创建第一份周报</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <div 
                key={r.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/70 transition-all cursor-pointer"
                onClick={() => viewReport(r.id)}
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200">{r.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span>{new Date(r.generated_at).toLocaleDateString('zh-CN')}</span>
                    <span>·</span>
                    <span>{r.article_count} 篇文章</span>
                    {r.new_this_week > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400">本周新增 {r.new_this_week}</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all">
                  查看
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
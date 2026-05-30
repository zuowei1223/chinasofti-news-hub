"use client";

interface CrawlProgressModalProps {
  isOpen: boolean;
  mode: string;
  progress: {
    event: string;
    step?: string;
    message: string;
    count?: number;
    sources?: string[];
    elapsed?: number;
    crawled?: number;
    saved?: number;
  };
  onClose: () => void;
}

export function CrawlProgressModal({ isOpen, mode, progress, onClose }: CrawlProgressModalProps) {
  if (!isOpen) return null;

  const isDone = progress.event === "done";
  const isError = progress.event === "error";
  
  // 计算进度百分比
  let progressPercent = 0;
  if (progress.step === "clear") progressPercent = 10;
  if (progress.step === "crawl") progressPercent = 30;
  if (progress.step === "crawled") progressPercent = 60;
  if (progress.step === "save") progressPercent = 80;
  if (isDone) progressPercent = 100;

  // 计算耗时
  const elapsed = progress.elapsed ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isDone ? onClose : undefined}
      />
      
      {/* 弹框主体 */}
      <div className="relative w-full max-w-md mx-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDone ? "bg-emerald-500/20" : isError ? "bg-red-500/20" : "bg-blue-500/20"
              }`}>
                {isDone ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : isError ? (
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {isDone ? "抓取完成" : isError ? "抓取失败" : "正在抓取..."}
                </h3>
                <p className="text-xs text-slate-400">
                  {mode === "incremental" ? "增量抓取 (5条)" : 
                   mode === "full" ? "全量抓取 (10条)" : 
                   "预置数据 (10条)"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{elapsed}</span>
              <span className="text-sm text-slate-400 ml-1">秒</span>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="px-6 py-4">
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
                isDone ? "bg-gradient-to-r from-emerald-500 to-cyan-500" :
                isError ? "bg-gradient-to-r from-red-500 to-orange-500" :
                "bg-gradient-to-r from-blue-500 to-cyan-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            {/* 进度百分比 */}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white/80">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* 状态信息 */}
        <div className="px-6 pb-4 space-y-3">
          {/* 当前步骤 */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDone ? "bg-emerald-500/20" : "bg-blue-500/20"
            }`}>
              <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">{progress.message}</p>
              {progress.sources && progress.sources.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  来源: {progress.sources.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* 抓取统计 */}
          {(progress.crawled || progress.count) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <p className="text-xs text-slate-400 mb-1">抓取数量</p>
                <p className="text-xl font-bold text-blue-400">{progress.crawled || progress.count || 0}</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <p className="text-xs text-slate-400 mb-1">保存数量</p>
                <p className="text-xl font-bold text-emerald-400">{progress.saved || 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {(isDone || isError) && (
          <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700">
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                isDone 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {isDone ? "完成" : "关闭"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
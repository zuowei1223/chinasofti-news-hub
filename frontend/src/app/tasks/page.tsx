"use client";
import { useState, useEffect, useCallback } from "react";

import { API_BASE as API } from "@/lib/api";
const ALL_CATEGORIES = ["公司动态", "产品技术", "合作生态", "市场拓展", "荣誉奖项", "财务投资", "人才文化", "其他"];
const ALL_SOURCES = [
  { id: "baidu", name: "百度搜索" },
  { id: "sogou", name: "搜狗搜索" },
  { id: "rss", name: "RSS 订阅" },
  { id: "preset", name: "预设数据" },
];

interface CrawlTask {
  id: string; name: string; enabled: boolean; interval_minutes: number;
  cron_expression: string; keywords: string[]; categories: string[];
  sources: string[]; created_at: string; last_run: string | null;
  last_result: { status: string; crawled: number; saved: number; new_articles: number; message: string } | null;
  next_run: string | null;
}

interface History {
  id: number; task_id?: string; task_name?: string; timestamp: string;
  status: string; crawled: number; saved: number; new_articles: number;
  sources: string[]; message: string;
}

const emptyForm = () => ({
  name: "", enabled: true, interval_minutes: 60, cron_expression: "",
  keywords: ["软通动力"], categories: ["产品技术", "合作生态"], sources: ["baidu", "sogou", "rss"],
});

export default function TasksPage() {
  const [tasks, setTasks] = useState<CrawlTask[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [kwInput, setKwInput] = useState("");
  const [tab, setTab] = useState<"tasks" | "history">("tasks");
  const [triggering, setTriggering] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [tr, hr] = await Promise.all([
        fetch(`${API}/api/tasks`),
        fetch(`${API}/api/history?limit=30`),
      ]);
      if (tr.ok) { const d = await tr.json(); setTasks(d.tasks || []); }
      if (hr.ok) { const d = await hr.json(); setHistory(d.history || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); 
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTask = async () => {
    if (!form.name.trim()) return;
    try {
      const url = editId ? `${API}/api/tasks/${editId}` : `${API}/api/tasks`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { setShowForm(false); setEditId(null); setForm(emptyForm()); load(); }
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("确认删除此任务？")) return;
    try { const res = await fetch(`${API}/api/tasks/${id}`, { method: "DELETE" }); if (res.ok) load(); }
    catch (e) { console.error(e); }
  };

  const toggleTask = async (id: string) => {
    try { const res = await fetch(`${API}/api/tasks/${id}/toggle`, { method: "POST" }); if (res.ok) load(); }
    catch (e) { console.error(e); }
  };

  const triggerTask = async (id: string) => {
    setTriggering(id);
    try { await fetch(`${API}/api/tasks/${id}/trigger`, { method: "POST" }); load(); }
    catch (e) { console.error(e); }
    setTriggering(null);
  };

  const startEdit = (t: CrawlTask) => {
    setEditId(t.id);
    setForm({ name: t.name, enabled: t.enabled, interval_minutes: t.interval_minutes, cron_expression: t.cron_expression, keywords: [...t.keywords], categories: [...t.categories], sources: [...t.sources] });
    setShowForm(true);
  };

  const addKw = () => {
    const kw = kwInput.trim();
    if (kw && !form.keywords.includes(kw)) { setForm({ ...form, keywords: [...form.keywords, kw] }); setKwInput(""); }
  };
  const rmKw = (kw: string) => setForm({ ...form, keywords: form.keywords.filter(k => k !== kw) });
  const toggleCat = (c: string) => setForm({ ...form, categories: form.categories.includes(c) ? form.categories.filter(x => x !== c) : [...form.categories, c] });
  const toggleSrc = (s: string) => setForm({ ...form, sources: form.sources.includes(s) ? form.sources.filter(x => x !== s) : [...form.sources, s] });

  const fmtTime = (iso: string | null) => {
    if (!iso) return "-";
    try { return new Date(iso).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  // 计算下一次执行时间
  const calcNextRun = (task: CrawlTask): string | null => {
    if (!task.enabled) return null; // 暂停的任务不计算
    
    // 如果后端已有计算值，直接使用
    if (task.next_run) return task.next_run;
    
    // 基于 interval_minutes 自动计算
    const lastRun = task.last_run ? new Date(task.last_run) : new Date();
    const next = new Date(lastRun.getTime() + task.interval_minutes * 60 * 1000);
    return next.toISOString();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">定时任务</h1>
          <p className="text-sm text-slate-400 mt-1">管理自动抓取任务，支持多任务并行调度</p>
        </div>
        <button 
          onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }} 
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新建任务
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit">
        <button 
          onClick={() => setTab("tasks")} 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "tasks" 
              ? "bg-slate-700 text-white shadow-sm" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          任务列表 ({tasks.length})
        </button>
        <button 
          onClick={() => setTab("history")} 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "history" 
              ? "bg-slate-700 text-white shadow-sm" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          抓取历史 ({history.length})
        </button>
      </div>

      {/* Tasks Tab */}
      {tab === "tasks" && (
        <div className="grid gap-4">
          {tasks.length === 0 && (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">⏰</div>
              <p className="text-slate-400 mb-4">暂无任务，点击右上角新建</p>
            </div>
          )}
          {tasks.map(t => (
            <div 
              key={t.id} 
              className={`group card p-6 transition-all duration-300 hover:shadow-xl ${
                t.enabled 
                  ? "border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10" 
                  : "border-l-4 border-l-slate-600 opacity-60 hover:opacity-80"
              }`}
            >
              {/* 第一行：标题 + 状态 + 操作 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{t.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    t.enabled 
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                      : "bg-slate-600/30 text-slate-400 border border-slate-600/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                    {t.enabled ? "运行中" : "已暂停"}
                  </span>
                  {t.last_result && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.last_result.status === "success" 
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" 
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}>
                      {t.last_result.status === "success" ? "✓" : "✗"}
                      上次 {t.last_result.saved} 篇
                    </span>
                  )}
                </div>
                {/* 操作按钮 - 始终显示 */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleTask(t.id)} 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      t.enabled 
                        ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30" 
                        : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                    }`}
                  >
                    {t.enabled ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                        暂停
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.987l11.54 6.348c1.205.663 1.205 2.313 0 2.976l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                        </svg>
                        启用
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => triggerTask(t.id)} 
                    disabled={triggering === t.id} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-all disabled:opacity-50"
                  >
                    <svg className={`w-4 h-4 ${triggering === t.id ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.987l11.54 6.348c1.205.663 1.205 2.313 0 2.976l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                    </svg>
                    执行
                  </button>
                  <button 
                    onClick={() => startEdit(t)} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                  <button 
                    onClick={() => deleteTask(t.id)} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>
              
              {/* 第二行：调度信息 */}
              <div className="flex flex-wrap gap-6 text-sm text-slate-400 mb-4">
                <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-white">{t.cron_expression || `每${t.interval_minutes}分钟`}</span>
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  上次：{fmtTime(t.last_run)}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2 2 0 012.25-2.25h13.5A2 2 0 0121 7.5v11.25m-18 0A2 2 0 005.25 21h13.5A2 2 0 0021 18.75m-18 0v-7.5A2 2 0 015.25 9h13.5A2 2 0 0121 11.25v7.5" />
                  </svg>
                  下次：{t.enabled ? fmtTime(calcNextRun(t)) : <span className="text-slate-500">已暂停</span>}
                </span>
              </div>
              
              {/* 第三行：关键词标签 */}
              <div className="flex flex-wrap gap-2">
                {t.keywords.slice(0, 6).map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30">
                    #{kw}
                  </span>
                ))}
                {t.keywords.length > 6 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                    +{t.keywords.length - 6}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">任务</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-center font-medium">抓取</th>
                <th className="px-4 py-3 text-center font-medium">保存</th>
                <th className="px-4 py-3 text-left font-medium">来源</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    暂无历史记录
                  </td>
                </tr>
              )}
              {history.map(h => (
                <tr key={h.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-300">{fmtTime(h.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-300">{h.task_name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={h.status === "success" ? "badge-success" : "badge-danger"}>
                      {h.status === "success" ? "成功" : "失败"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{h.crawled}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{h.saved}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(h.sources || []).map(s => (
                        <span key={s} className="tag-blue text-[10px]">{s}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Drawer - 侧边抽屉 */}
      {showForm && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in"
            onClick={() => setShowForm(false)}
          />
          {/* 抽屉主体 */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xl z-[70] flex animate-slide-in-right">
            <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 border-l border-slate-600 flex flex-col shadow-2xl">
              {/* Header - 固定顶部 */}
              <div className="flex-shrink-0 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editId ? "编辑任务" : "新建任务"}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">配置定时抓取任务的参数和调度规则</p>
                </div>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content - 可滚动 */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 基础配置 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.293c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.714.393 1.24.955 1.551 1.632a2.25 2.25 0 01-1.551 2.915l-.213 1.281c-.09.542-.56.94-1.11.94h-2.293c-.55 0-1.02-.398-1.11-.94l-.213-1.281a2.25 2.25 0 01-1.551-2.915c.311-.677.837-1.239 1.551-1.632.332-.184.582-.496.645-.87l.213-1.281z" />
                  </svg>
                  基础配置
                </h3>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">任务名称</label>
                    <input 
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="如：每日软通新闻" 
                    />
                  </div>
                </div>
              </div>
              
              {/* 调度设置 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  调度设置
                </h3>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
                  {/* 快捷预设 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">快捷预设</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "每小时", interval: 60, cron: "" },
                        { label: "每6小时", interval: 360, cron: "" },
                        { label: "每天9点", interval: 1440, cron: "0 9 * * *" },
                        { label: "每周一", interval: 10080, cron: "0 9 * * 1" },
                      ].map(p => (
                        <button
                          key={p.label}
                          onClick={() => setForm({ ...form, interval_minutes: p.interval, cron_expression: p.cron })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            form.interval_minutes === p.interval && form.cron_expression === p.cron
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                              : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 border border-slate-600/50"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">间隔（分钟）</label>
                      <input 
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                        type="number" 
                        min={10} 
                        value={form.interval_minutes} 
                        onChange={e => setForm({ ...form, interval_minutes: parseInt(e.target.value) || 60 })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Cron 表达式（可选）</label>
                      <input 
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                        value={form.cron_expression} 
                        onChange={e => setForm({ ...form, cron_expression: e.target.value })} 
                        placeholder="0 9 * * *" 
                      />
                      <p className="text-xs text-slate-500 mt-1">格式：分 时 日 月 周</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 抓取设置 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  抓取设置
                </h3>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
                  {/* 关键词 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">关键词（回车添加）</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                        value={kwInput} 
                        onChange={e => setKwInput(e.target.value)} 
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKw())} 
                        placeholder="输入关键词后回车" 
                      />
                      <button 
                        onClick={addKw}
                        className="px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all font-medium"
                      >
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.keywords.map(kw => (
                        <span 
                          key={kw} 
                          onClick={() => rmKw(kw)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30 cursor-pointer hover:opacity-70 transition-opacity"
                        >
                          #{kw}
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* 关注分类 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">关注分类</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.map(c => (
                        <button
                          key={c} 
                          onClick={() => toggleCat(c)} 
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            form.categories.includes(c) 
                              ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/50" 
                              : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 border border-slate-600/50"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 抓取源 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">抓取源</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SOURCES.map(s => (
                        <button
                          key={s.id} 
                          onClick={() => toggleSrc(s.id)} 
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            form.sources.includes(s.id) 
                              ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/50" 
                              : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 border border-slate-600/50"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer - 固定底部 */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={saveTask}
                disabled={!form.name.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editId ? "保存修改" : "创建任务"}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

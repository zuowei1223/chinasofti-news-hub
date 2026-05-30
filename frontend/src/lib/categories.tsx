// 分类配置 - 每个分类有独立图标、渐变色、边框色
export interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "产品技术": {
    id: "product",
    name: "产品技术",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    gradient: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
  "合作生态": {
    id: "partnership",
    name: "合作生态",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-500",
    borderColor: "border-emerald-400",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
  },
  "市场拓展": {
    id: "market",
    name: "市场拓展",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    gradient: "from-amber-500 to-orange-500",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
  },
  "财务投资": {
    id: "finance",
    name: "财务投资",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-purple-500 to-pink-500",
    borderColor: "border-purple-400",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
  "荣誉奖项": {
    id: "award",
    name: "荣誉奖项",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172V9.75a3.375 3.375 0 11-6.75 0v1.578c0 1.096-.344 2.13-.982 3.172m0 0a7.454 7.454 0 01-2.986-3.172m11.946 0a7.454 7.454 0 002.986-3.172" />
      </svg>
    ),
    gradient: "from-teal-500 to-cyan-500",
    borderColor: "border-teal-400",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-400",
  },
  "公司动态": {
    id: "company",
    name: "公司动态",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    gradient: "from-indigo-500 to-blue-500",
    borderColor: "border-indigo-400",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-400",
  },
  "人才文化": {
    id: "culture",
    name: "人才文化",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    gradient: "from-pink-500 to-rose-500",
    borderColor: "border-pink-400",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-400",
  },
  "其他": {
    id: "other",
    name: "其他",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.593l6.002-4.299a1.125 1.125 0 00.553-1.125c0-.88-.31-1.642-.822-2.154L9.568 3z" />
      </svg>
    ),
    gradient: "from-slate-500 to-gray-500",
    borderColor: "border-slate-400",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-400",
  },
};

// 情感配置
export interface SentimentConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const SENTIMENT_CONFIG: Record<string, SentimentConfig> = {
  "正面": {
    label: "正面",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-400/30",
  },
  "中性": {
    label: "中性",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0zM12 12.75h.008v.008H12V12.75zm.75-3v.008h-.008V9.75h.008z" />
      </svg>
    ),
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-400/30",
  },
  "负面": {
    label: "负面",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-5.25 3.192l-.707.708a.533.533 0 01-.755 0l-.07-.07a.533.533 0 010-.755l.707-.707a.533.533 0 01.755 0l.07.07a.533.533 0 010 .754zm3.854 0l-.707.708a.533.533 0 01-.755 0l-.07-.07a.533.533 0 010-.755l.707-.707a.533.533 0 01.755 0l.07.07a.533.533 0 010 .754z" />
      </svg>
    ),
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-400/30",
  },
};

// 获取分类样式
export function getCategoryStyle(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG["其他"];
}

// 获取情感样式
export function getSentimentStyle(sentiment: string) {
  return SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG["中性"];
}

"use client";

import { Inbox, Search, Filter } from "lucide-react";

interface EmptyStateProps {
  type?: "no-data" | "no-results" | "error";
  message?: string;
  onReset?: () => void;
}

export default function EmptyState({ type = "no-data", message, onReset }: EmptyStateProps) {
  const config = {
    "no-data": {
      icon: Inbox,
      title: "暂无新闻数据",
      description: "新闻数据正在收集中，请稍后再来查看",
      action: null,
    },
    "no-results": {
      icon: Search,
      title: "未找到匹配结果",
      description: "尝试调整筛选条件或清除关键词重新搜索",
      action: "清除筛选",
    },
    error: {
      icon: Filter,
      title: "加载失败",
      description: message || "网络异常，请检查连接后重试",
      action: "重试",
    },
  };

  const { icon: Icon, title, description, action } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      {action && onReset && (
        <button
          onClick={onReset}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
        >
          {action}
        </button>
      )}
    </div>
  );
}

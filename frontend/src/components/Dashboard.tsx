"use client";

import { TrendingUp, TrendingDown, Calendar, Tag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DashboardProps {
  total: number;
  categoryDist?: { category: string; count: number }[];
  sentimentDist?: { sentiment: string; count: number }[];
  recentTrend?: { date: string; count: number }[];
}

const COLORS = {
  category: {
    公司动态: "#3b82f6",
    技术创新: "#8b5cf6",
    行业洞察: "#06b6d4",
    合作共赢: "#10b981",
    社会责任: "#f59e0b",
    荣誉奖项: "#ef4444",
    市场动态: "#ec4899",
    政策解读: "#6366f1",
  },
  sentiment: {
    positive: "#10b981",
    neutral: "#6b7280",
    negative: "#ef4444",
  },
};

export default function Dashboard({ total, categoryDist, sentimentDist, recentTrend }: DashboardProps) {
  // 模拟数据（实际应从后端 API 获取）
  const mockCategoryDist = categoryDist || [
    { category: "公司动态", count: 8 },
    { category: "技术创新", count: 6 },
    { category: "行业洞察", count: 4 },
    { category: "合作共赢", count: 3 },
    { category: "社会责任", count: 2 },
  ];

  const mockSentimentDist = sentimentDist || [
    { sentiment: "积极", count: 15 },
    { sentiment: "中性", count: 8 },
    { sentiment: "消极", count: 2 },
  ];

  const mockTrend = recentTrend || [
    { date: "5-22", count: 3 },
    { date: "5-23", count: 5 },
    { date: "5-24", count: 2 },
    { date: "5-25", count: 6 },
    { date: "5-26", count: 4 },
    { date: "5-27", count: 7 },
    { date: "5-28", count: 5 },
  ];

  const positiveCount = mockSentimentDist.find((s) => s.sentiment === "积极")?.count || 0;
  const positiveRate = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 统计卡片 */}
      <div className="card-hover rounded-xl p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">新闻总数</p>
            <p className="text-3xl font-bold">{total}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-blue-100 text-xs">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span>近 7 天数据</span>
        </div>
      </div>

      <div className="card-hover rounded-xl p-5 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm mb-1">积极舆情</p>
            <p className="text-3xl font-bold">{positiveRate}%</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-green-100 text-xs">
          <span>情感分析结果</span>
        </div>
      </div>

      <div className="card-hover rounded-xl p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm mb-1">分类覆盖</p>
            <p className="text-3xl font-bold">{mockCategoryDist.length}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-purple-100 text-xs">
          <span>个业务领域</span>
        </div>
      </div>

      <div className="card-hover rounded-xl p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm mb-1">数据更新</p>
            <p className="text-3xl font-bold">今日</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-orange-100 text-xs">
          <span>实时同步</span>
        </div>
      </div>

      {/* 分类分布图表 */}
      <div className="card-hover rounded-xl p-5 bg-gray-800/50 border border-gray-700 md:col-span-2">
        <h3 className="text-gray-200 font-semibold mb-4 text-sm">分类分布</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockCategoryDist}>
            <XAxis dataKey="category" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
              cursor={{ fill: "#374151" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {mockCategoryDist.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.category[entry.category as keyof typeof COLORS.category] || "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 情感分布图表 */}
      <div className="card-hover rounded-xl p-5 bg-gray-800/50 border border-gray-700 md:col-span-2">
        <h3 className="text-gray-200 font-semibold mb-4 text-sm">情感分析</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockSentimentDist} layout="vertical">
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="sentiment" type="category" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
              cursor={{ fill: "#374151" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {mockSentimentDist.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS.sentiment[entry.sentiment as keyof typeof COLORS.sentiment] || "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

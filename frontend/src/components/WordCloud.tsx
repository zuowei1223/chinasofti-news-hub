"use client";

import { useMemo } from "react";

interface WordCloudProps {
  articles?: Array<{
    title: string;
    summary?: string;
  }>;
}

// 简易中文分词（基于常见关键词）
const KEYWORDS = [
  "软通动力", "人工智能", "大模型", "数字化转型", "智慧办公", "创新", "技术", "合作",
  "生态", "平台", "数据", "智能", "云", "AI", "算法", "应用", "服务", "企业",
  "行业", "解决方案", "发展", "战略", "发布", "上线", "签约", "获奖", "认证",
  "华为", "鸿蒙", "开源", "研发", "产品", "市场", "客户", "增长", "领先",
];

export default function WordCloud({ articles = [] }: WordCloudProps) {
  const wordFreq = useMemo(() => {
    const freq: Record<string, number> = {};

    articles.forEach((article) => {
      const text = `${article.title} ${article.summary || ""}`;
      KEYWORDS.forEach((word) => {
        if (text.includes(word)) {
          freq[word] = (freq[word] || 0) + 1;
        }
      });
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30); // 取前 30 个关键词
  }, [articles]);

  if (wordFreq.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>暂无词云数据</p>
      </div>
    );
  }

  const maxCount = Math.max(...wordFreq.map(([, count]) => count));

  return (
    <div className="flex flex-wrap gap-2 justify-center py-6">
      {wordFreq.map(([word, count], index) => {
        const size = 0.75 + (count / maxCount) * 1.25; // 0.75rem ~ 2rem
        const hue = 200 + (index / wordFreq.length) * 100; // 蓝色到紫色渐变
        const saturation = 60 + (count / maxCount) * 40; // 60% ~ 100%

        return (
          <span
            key={word}
            className="inline-block px-3 py-1.5 rounded-full bg-gray-800/80 border border-gray-700 hover:border-blue-500/50 hover:bg-blue-900/30 transition-all duration-200 cursor-default"
            style={{
              fontSize: `${size}rem`,
              color: `hsl(${hue}, ${saturation}%, 70%)`,
              textShadow: `0 0 20px hsla(${hue}, ${saturation}%, 50%, 0.3)`,
            }}
            title={`${word}: ${count}次`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

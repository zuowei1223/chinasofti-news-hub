"""
软通新闻智能整理器 - 数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class NewsCategory(str, Enum):
    COMPANY = "公司动态"
    PRODUCT = "产品技术"
    PARTNERSHIP = "合作生态"
    MARKET = "市场拓展"
    AWARD = "荣誉奖项"
    FINANCE = "财务投资"
    TALENT = "人才文化"
    OTHER = "其他"


class Sentiment(str, Enum):
    POSITIVE = "正面"
    NEUTRAL = "中性"
    NEGATIVE = "负面"


class NewsArticle(BaseModel):
    """新闻文章模型"""
    id: Optional[int] = None
    title: str
    source: str = ""
    url: str = ""
    content: str = ""
    publish_date: Optional[str] = None
    crawled_at: str = Field(default_factory=lambda: datetime.now().isoformat())

    # AI 生成字段
    summary: str = ""
    category: str = NewsCategory.OTHER
    keywords: list[str] = Field(default_factory=list)
    sentiment: str = Sentiment.NEUTRAL
    importance_score: float = 0.5  # 0-1 重要性评分

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    """新闻列表响应"""
    total: int
    page: int
    page_size: int
    articles: list[NewsArticle]


class DashboardStats(BaseModel):
    """仪表盘统计数据"""
    total_articles: int
    category_distribution: dict[str, int]
    sentiment_distribution: dict[str, int]
    daily_trend: list[dict]
    top_keywords: list[dict]
    date_range: dict[str, str]

"""
软通新闻智能整理器 - 多源新闻抓取引擎
支持：百度搜索、搜狗搜索、RSS订阅、预置数据
"""
import os
import re
import json
import asyncio
import aiohttp
import feedparser
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote


# ──────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────

def clean_text(text: str) -> str:
    """清理文本"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def is_relevant(article: dict, keywords: list, categories: list) -> bool:
    """判断文章是否与关注关键词/分类相关"""
    title = article.get("title", "").lower()
    content = article.get("content", "").lower()
    text = f"{title} {content}"
    
    # 关键词匹配（至少包含一个关注关键词）
    for kw in keywords:
        if kw.lower() in text:
            return True
    
    # 分类匹配（如果文章已有分类字段）
    article_cat = article.get("category", "")
    if article_cat and article_cat in categories:
        return True
    
    return True  # 默认通过，后续AI分析会重新分类


def deduplicate_articles(articles: list, by_title: bool = True) -> list:
    """去重"""
    seen = set()
    result = []
    for a in articles:
        key = a.get("title", "")[:50] if by_title else a.get("url", "")
        if key and key not in seen:
            seen.add(key)
            result.append(a)
    return result


# ──────────────────────────────────────────
# 抓取源：百度搜索
# ──────────────────────────────────────────

# 超时配置（秒）
CRAWL_TIMEOUT = 15  # 单个请求超时
CRAWL_TOTAL_TIMEOUT = 120  # 整体抓取超时

# 抓取数量配置
INCREMENTAL_MAX = 5   # 增量抓取
FULL_MAX = 10         # 全量抓取
PRESET_MAX = 10       # 预置数据

async def crawl_baidu(query: str = "软通动力", max_results: int = 10) -> list:
    """
    百度搜索抓取
    注意：百度有反爬机制，可能需要验证码
    """
    articles = []
    url = f"https://www.baidu.com/s?wd={quote(query)}&tn=news&rtt=1&bsst=1&cl=2"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    
    try:
        timeout = aiohttp.ClientTimeout(total=CRAWL_TIMEOUT)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    html = await resp.text(encoding="utf-8", errors="ignore")
                    # 简单解析搜索结果（真实项目建议用BeautifulSoup）
                    # 这里用正则提取标题和链接
                    pattern = r'<h3[^>]*class="[^"]*t[^"]*"[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>'
                    matches = re.findall(pattern, html, re.DOTALL)
                    
                    for i, (link, title) in enumerate(matches[:max_results]):
                        title = clean_text(re.sub(r'<[^>]+>', '', title))
                        if title and len(title) > 5:
                            articles.append({
                                "title": title,
                                "url": link,
                                "source": "百度搜索",
                                "content": f"来自百度搜索: {title}",
                                "publish_date": datetime.now().strftime("%Y-%m-%d"),
                            })
                    
                    print(f"[Crawler] 百度搜索: 找到 {len(articles)} 条结果")
                else:
                    print(f"[Crawler] 百度搜索失败: HTTP {resp.status}")
    except Exception as e:
        print(f"[Crawler] 百度搜索异常: {e}")
    
    return articles


# ──────────────────────────────────────────
# 抓取源：搜狗搜索
# ──────────────────────────────────────────

async def crawl_sogou(query: str = "软通动力", max_results: int = 10) -> list:
    """搜狗新闻搜索"""
    articles = []
    url = f"https://news.sogou.com/news?query={quote(query)}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        timeout = aiohttp.ClientTimeout(total=CRAWL_TIMEOUT)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    html = await resp.text(encoding="utf-8", errors="ignore")
                    # 简单解析
                    pattern = r'<h3[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>'
                    matches = re.findall(pattern, html, re.DOTALL)
                    
                    for link, title in matches[:max_results]:
                        title = clean_text(re.sub(r'<[^>]+>', '', title))
                        if title and len(title) > 5:
                            articles.append({
                                "title": title,
                                "url": link,
                                "source": "搜狗搜索",
                                "content": f"来自搜狗搜索: {title}",
                                "publish_date": datetime.now().strftime("%Y-%m-%d"),
                            })
                    
                    print(f"[Crawler] 搜狗搜索: 找到 {len(articles)} 条结果")
    except Exception as e:
        print(f"[Crawler] 搜狗搜索异常: {e}")
    
    return articles


# ──────────────────────────────────────────
# 抓取源：RSS订阅
# ──────────────────────────────────────────

RSS_FEEDS = [
    # 科技媒体RSS
    "https://www.36kr.com/feed",                    # 36氪 ✅ 稳定
    "https://www.ifanr.com/feed",                   # 爱范儿 ✅ 稳定
    "https://www.ithome.com/rss/",                  # IT之家 ✅ 稳定
    "https://sspai.com/feed",                       # 少数派 ✅ 稳定
    # 财经/商业媒体
    "https://www.caixin.com/rss/rss_finance.xml",   # 财新财经
]


async def crawl_rss(feeds: list = None, keywords: list = None, max_per_feed: int = 5) -> list:
    """RSS订阅抓取"""
    articles = []
    feeds = feeds or RSS_FEEDS
    # 关键词：软通相关 + 科技/IT通用关键词（放宽过滤）
    keywords = keywords or ["软通动力", "软通", "Chinasofti", "软件开发", "IT服务", "人工智能", "AI", "科技", "互联网", "数字化转型"]
    
    for feed_url in feeds:
        try:
            # feedparser同步解析，需要在线程中运行
            parsed = await asyncio.get_event_loop().run_in_executor(
                None, lambda: feedparser.parse(feed_url)
            )
            
            for entry in parsed.entries[:max_per_feed]:
                title = entry.get("title", "")
                content = entry.get("summary", "") or entry.get("description", "")
                link = entry.get("link", "")
                pub_date = entry.get("published", "") or entry.get("updated", "")
                
                # 关键词过滤
                text = f"{title} {content}".lower()
                if any(kw.lower() in text for kw in keywords):
                    # 解析日期
                    date_str = datetime.now().strftime("%Y-%m-%d")
                    if pub_date:
                        try:
                            from email.utils import parsedate_to_datetime
                            dt = parsedate_to_datetime(pub_date)
                            date_str = dt.strftime("%Y-%m-%d")
                        except Exception:
                            pass
                    
                    articles.append({
                        "title": clean_text(title),
                        "url": link,
                        "source": parsed.feed.get("title", "RSS订阅"),
                        "content": clean_text(content[:500]),
                        "publish_date": date_str,
                    })
            
            print(f"[Crawler] RSS {feed_url}: 找到 {len(parsed.entries)} 条")
        except Exception as e:
            print(f"[Crawler] RSS抓取异常 {feed_url}: {e}")
    
    print(f"[Crawler] RSS总计: {len(articles)} 条相关文章")
    return articles


# ──────────────────────────────────────────
# 抓取源：预置数据（高质量人工精选）
# ──────────────────────────────────────────

async def crawl_preset(max_articles: int = PRESET_MAX) -> list:
    """预置高质量数据"""
    from crawler.preset_data import get_preset_news
    all_articles = get_preset_news()
    articles = all_articles[:max_articles]
    print(f"[Crawler] 预置数据: {len(articles)} 篇（共{len(all_articles)}篇可选）")
    return articles


# ──────────────────────────────────────────
# 统一抓取入口
# ──────────────────────────────────────────

async def crawl_all(config: dict = None) -> dict:
    """
    根据配置执行多源抓取
    返回：{
        "articles": [...],
        "crawled": 总抓取数,
        "filtered": 过滤后数量,
        "sources": ["baidu", "sogou", ...],
        "errors": [...]
    }
    """
    config = config or {}
    sources = config.get("sources", {})
    keywords = config.get("focus_keywords", ["软通动力"])
    categories = config.get("focus_categories", [])
    
    # 抓取模式：incremental(增量5条) / full(全量10条) / preset(预置10条)
    mode = config.get("mode", "full")
    if mode == "incremental":
        max_articles = INCREMENTAL_MAX
    elif mode == "preset":
        max_articles = PRESET_MAX
    else:
        max_articles = FULL_MAX
    
    dedup = config.get("dedup_by_title", True)
    
    all_articles = []
    active_sources = []
    errors = []
    
    # 并发抓取各源（使用 asyncio.wait_for 控制整体超时）
    tasks = []
    
    # 只抓取指定的源，默认不抓取任何源
    if sources.get("baidu", False):
        tasks.append(("baidu", crawl_baidu("软通动力 新闻", max_results=10)))
    
    if sources.get("sogou", False):
        tasks.append(("sogou", crawl_sogou("软通动力", max_results=10)))
    
    if sources.get("rss", False):
        tasks.append(("rss", crawl_rss(keywords=keywords, max_per_feed=5)))
    
    if sources.get("preset", False):
        tasks.append(("preset", crawl_preset()))
    
    # 并行执行抓取（带整体超时）
    async def run_crawl():
        results = []
        for src_name, task in tasks:
            try:
                articles = await task
                results.append((src_name, articles, None))
            except Exception as e:
                results.append((src_name, None, str(e)))
        return results
    
    try:
        crawl_results = await asyncio.wait_for(run_crawl(), timeout=CRAWL_TOTAL_TIMEOUT)
    except asyncio.TimeoutError:
        errors.append(f"整体抓取超时（{CRAWL_TOTAL_TIMEOUT}秒）")
        crawl_results = []
    
    # 处理结果
    for src_name, articles, error in crawl_results:
        if error:
            errors.append(f"{src_name}: {error}")
        elif articles:
            all_articles.extend(articles)
            active_sources.append(src_name)
    
    # 去重
    if dedup:
        all_articles = deduplicate_articles(all_articles, by_title=True)
    
    # 关键词/分类过滤
    filtered = [a for a in all_articles if is_relevant(a, keywords, categories)]
    
    # 限制数量
    filtered = filtered[:max_articles]
    
    return {
        "articles": filtered,
        "crawled": len(all_articles),
        "filtered": len(filtered),
        "sources": active_sources,
        "errors": errors,
    }

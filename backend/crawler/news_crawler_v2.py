"""
软通新闻智能整理器 - 新闻爬虫 V2
使用RSS + 多源API采集高质量新闻
"""
import httpx
import asyncio
import re
import json
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urljoin, quote, urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_date(date_str: str) -> Optional[str]:
    """解析各种日期格式"""
    if not date_str:
        return None
    try:
        # 尝试常见格式
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日", "%a, %d %b %Y %H:%M:%S"]:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.strftime("%Y-%m-%d")
            except:
                continue
        # RSS格式
        from email.utils import parsedate_to_datetime
        try:
            dt = parsedate_to_datetime(date_str)
            return dt.strftime("%Y-%m-%d")
        except:
            pass
    except:
        pass
    return None


# ──────────────────────────────────────────
# 数据源1: 东方财富 - 软通动力股票新闻
# ──────────────────────────────────────────
async def crawl_eastmoney(client: httpx.AsyncClient) -> list[dict]:
    """东方财富网 - 301236 软通动力股票新闻"""
    articles = []
    
    # 东方财富股票新闻API
    url = "https://np-listapi.eastmoney.com/comm/web/getListInfo"
    params = {
        "type": "106",  # 新闻类型
        "code": "301236",  # 软通动力股票代码
        "pageSize": 30,
        "pageNo": 1,
        "fields": "title,url,source_url,source_name,pub_time,summary"
    }
    
    try:
        resp = await client.get(url, params=params, timeout=15)
        data = resp.json()
        
        if data.get("data") and data["data"].get("list"):
            for item in data["data"]["list"]:
                title = item.get("title", "")
                if not title or "软通" not in title:
                    continue
                    
                pub_time = item.get("pub_time", "")
                if pub_time:
                    # 时间戳转日期
                    try:
                        dt = datetime.fromtimestamp(int(pub_time))
                        pub_date = dt.strftime("%Y-%m-%d")
                    except:
                        pub_date = None
                else:
                    pub_date = None
                
                # 检查是否在30天内
                if pub_date:
                    try:
                        article_date = datetime.strptime(pub_date, "%Y-%m-%d")
                        if article_date < datetime.now() - timedelta(days=35):
                            continue
                    except:
                        pass
                
                articles.append({
                    "title": clean_text(title),
                    "url": item.get("url", ""),
                    "source": item.get("source_name", "东方财富"),
                    "publish_date": pub_date,
                    "content": clean_text(item.get("summary", ""))
                })
        
        print(f"[东方财富] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[东方财富] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源2: 同花顺 - 股票新闻
# ──────────────────────────────────────────
async def crawl_10jqka(client: httpx.AsyncClient) -> list[dict]:
    """同花顺财经"""
    articles = []
    
    # 同花顺股票新闻页面
    url = "https://stockpage.10jqka.com.cn/301236/"
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        # 查找新闻列表
        news_items = soup.select(".news-item") or soup.select(".stock-news li") or soup.select(".list-item")
        
        for item in news_items[:20]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or "软通" not in title:
                continue
            
            # 提取日期
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            articles.append({
                "title": title,
                "url": urljoin(url, href) if href.startswith("/") else href,
                "source": "同花顺",
                "publish_date": date_text or None,
                "content": ""
            })
        
        print(f"[同花顺] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[同花顺] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源3: 新浪财经 RSS
# ──────────────────────────────────────────
async def crawl_sina_finance(client: httpx.AsyncClient) -> list[dict]:
    """新浪财经RSS + 搜索"""
    articles = []
    
    # 新浪财经搜索API
    url = f"https://search.sina.com.cn/?q={quote('软通动力')}&c=news&from=channel&ie=utf-8"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        result_items = soup.select(".result") or soup.select(".news-item") or soup.select("li")
        
        for item in result_items[:25]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            if "软通" not in title:
                continue
            
            # 提取摘要
            content = ""
            content_tag = item.select_one("p") or item.select_one(".content")
            if content_tag:
                content = clean_text(content_tag.get_text())
            
            # 提取日期
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            articles.append({
                "title": title,
                "url": href,
                "source": "新浪财经",
                "publish_date": date_text or None,
                "content": content
            })
        
        print(f"[新浪财经] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[新浪财经] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源4: 网易财经
# ──────────────────────────────────────────
async def crawl_netease_finance(client: httpx.AsyncClient) -> list[dict]:
    """网易财经"""
    articles = []
    
    url = f"https://money.163.com/keyword/{quote('软通动力')}.html"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        items = soup.select(".news-item") or soup.select(".item") or soup.select("li")
        
        for item in items[:25]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            
            # 提取日期
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            articles.append({
                "title": title,
                "url": urljoin("https://money.163.com/", href) if href.startswith("/") else href,
                "source": "网易财经",
                "publish_date": date_text or None,
                "content": ""
            })
        
        print(f"[网易财经] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[网易财经] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源5: 腾讯财经
# ──────────────────────────────────────────
async def crawl_tencent_finance(client: httpx.AsyncClient) -> list[dict]:
    """腾讯财经"""
    articles = []
    
    # 腾讯财经搜索
    url = f"https://new.qq.com/search?query={quote('软通动力')}"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        items = soup.select(".result-item") or soup.select(".news-item") or soup.select("li[class*='item']")
        
        for item in items[:25]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            if "软通" not in title:
                continue
            
            # 提取日期
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            # 提取摘要
            content = ""
            content_tag = item.select_one("p") or item.select_one(".desc")
            if content_tag:
                content = clean_text(content_tag.get_text())
            
            articles.append({
                "title": title,
                "url": href,
                "source": "腾讯财经",
                "publish_date": date_text or None,
                "content": content
            })
        
        print(f"[腾讯财经] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[腾讯财经] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源6: 雪球
# ──────────────────────────────────────────
async def crawl_xueqiu(client: httpx.AsyncClient) -> list[dict]:
    """雪球 - 软通动力讨论和新闻"""
    articles = []
    
    # 雪球API
    url = "https://xueqiu.com/query/v1/search/status.json"
    params = {
        "q": "软通动力",
        "count": 30,
        "page": 1,
        "sort": "time"  # 按时间排序
    }
    
    try:
        # 雪球需要先访问主页获取cookie
        await client.get("https://xueqiu.com/", timeout=10)
        
        resp = await client.get(url, params=params, timeout=15)
        data = resp.json()
        
        if data.get("list"):
            for item in data["list"]:
                title = item.get("title", "") or item.get("text", "")[:100]
                if not title:
                    continue
                
                # 时间戳
                created_at = item.get("created_at", 0)
                pub_date = None
                if created_at:
                    try:
                        dt = datetime.fromtimestamp(created_at / 1000)
                        pub_date = dt.strftime("%Y-%m-%d")
                        
                        # 检查30天内
                        if dt < datetime.now() - timedelta(days=35):
                            continue
                    except:
                        pass
                
                # 提取内容
                content = item.get("text", "")
                
                articles.append({
                    "title": clean_text(title[:80]),
                    "url": f"https://xueqiu.com/{item.get('user', {}).get('id', '')}/{item.get('id', '')}",
                    "source": "雪球",
                    "publish_date": pub_date,
                    "content": clean_text(content)[:500]
                })
        
        print(f"[雪球] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[雪球] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 补充正文内容
# ──────────────────────────────────────────
async def enrich_content(client: httpx.AsyncClient, articles: list[dict]) -> list[dict]:
    """对内容不足的文章补充爬取正文"""
    enriched = []
    
    for article in articles:
        if len(article.get("content", "")) >= 100:
            enriched.append(article)
            continue
        
        url = article.get("url", "")
        if not url or not url.startswith("http"):
            enriched.append(article)
            continue
        
        try:
            html = await client.get(url, timeout=10, follow_redirects=True).text
            soup = BeautifulSoup(html, "lxml")
            
            # 多种正文选择器
            content_selectors = [
                ".article-content", ".news-content", ".content-body",
                ".detail-content", "article", ".post-content",
                "#article", ".text-content", ".main-content"
            ]
            
            content = ""
            for selector in content_selectors:
                tags = soup.select(selector)
                if tags:
                    content = clean_text(tags[0].get_text())
                    if len(content) > 200:
                        break
            
            if content:
                article["content"] = content[:2000]  # 限制长度
            
            await asyncio.sleep(0.3)
        except:
            pass
        
        enriched.append(article)
    
    return enriched


# ──────────────────────────────────────────
# 主爬虫入口
# ──────────────────────────────────────────
async def crawl_all_news() -> list[dict]:
    """执行全部爬虫"""
    all_articles = []
    
    async with httpx.AsyncClient(headers=HEADERS, verify=False, timeout=20) as client:
        print("[Crawler V2] 开始采集软通动力新闻...")
        
        tasks = [
            ("东方财富", crawl_eastmoney(client)),
            ("新浪财经", crawl_sina_finance(client)),
            ("腾讯财经", crawl_tencent_finance(client)),
            ("雪球", crawl_xueqiu(client)),
            ("网易财经", crawl_netease_finance(client)),
            ("同花顺", crawl_10jqka(client)),
        ]
        
        results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        
        for (name, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                print(f"[{name}] 爬取异常: {result}")
            elif isinstance(result, list):
                all_articles.extend(result)
    
    # 去重
    seen_titles = set()
    unique = []
    for a in all_articles:
        key = a["title"].strip()[:40]
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(a)
    
    # 补充正文
    print(f"[Crawler V2] 开始补充正文内容...")
    async with httpx.AsyncClient(headers=HEADERS, verify=False, timeout=15) as client:
        unique = await enrich_content(client, unique)
    
    print(f"[Crawler V2] 总计 {len(all_articles)} 篇，去重后 {len(unique)} 篇")
    return unique


if __name__ == "__main__":
    articles = asyncio.run(crawl_all_news())
    print(f"\n共采集 {len(articles)} 篇文章")
    for a in articles[:10]:
        print(f"\n--- {a['title'][:50]} ---")
        print(f"来源: {a['source']} | 日期: {a.get('publish_date', 'N/A')}")
        print(f"内容长度: {len(a.get('content', ''))} 字")
        print(f"URL: {a['url'][:80]}")

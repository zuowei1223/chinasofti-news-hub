"""
软通新闻智能整理器 - 新闻爬虫 V3
多源采集高质量新闻
"""
import httpx
import asyncio
import re
import json
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urljoin, quote

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.baidu.com/"
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    # 移除HTML标签
    text = re.sub(r'<[^>]+>', '', text)
    return text


# ──────────────────────────────────────────
# 数据源1: 东方财富股票新闻API
# ──────────────────────────────────────────
async def crawl_eastmoney(client: httpx.AsyncClient) -> list[dict]:
    """东方财富 - 301236 软通动力"""
    articles = []
    
    # 东方财富个股新闻API
    url = "https://np-anotice-stock.eastmoney.com/api/security/ann"
    params = {
        "cb": "callback",
        "sr": "-1",
        "page_size": 30,
        "page_index": 1,
        "ann_type": "OR,ORS,ON",  # 新闻类型
        "client_source": "web",
        "f_node": "301236",  # 软通动力代码
        "s_node": "301236"
    }
    
    try:
        resp = await client.get(url, params=params, timeout=15)
        text = resp.text
        
        # JSONP格式，提取JSON
        match = re.search(r'callback\((.*)\)', text)
        if match:
            data = json.loads(match.group(1))
            
            if data.get("data") and data["data"].get("list"):
                for item in data["data"]["list"]:
                    title = item.get("title", "")
                    if not title:
                        continue
                    
                    # 时间
                    pub_time = item.get("publish_time", "")
                    pub_date = None
                    if pub_time:
                        try:
                            dt = datetime.strptime(pub_time, "%Y-%m-%d %H:%M:%S")
                            pub_date = dt.strftime("%Y-%m-%d")
                        except:
                            pass
                    
                    articles.append({
                        "title": clean_text(title),
                        "url": item.get("url", ""),
                        "source": "东方财富",
                        "publish_date": pub_date,
                        "content": ""
                    })
        
        print(f"[东方财富] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[东方财富] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源2: 雪球
# ──────────────────────────────────────────
async def crawl_xueqiu(client: httpx.AsyncClient) -> list[dict]:
    """雪球讨论和新闻"""
    articles = []
    
    # 先访问主页获取cookie
    try:
        await client.get("https://xueqiu.com/", timeout=10)
    except:
        pass
    
    # 搜索API
    url = "https://xueqiu.com/query/v1/search/status.json"
    params = {
        "q": "软通动力",
        "count": 30,
        "page": 1,
        "sort": "time"
    }
    
    try:
        resp = await client.get(url, params=params, timeout=15)
        data = resp.json()
        
        if data.get("list"):
            for item in data["list"]:
                title = item.get("title", "") or item.get("text", "")[:100]
                if not title:
                    continue
                
                # 过滤无关内容
                if "软通" not in title and "软通" not in item.get("text", ""):
                    continue
                
                created_at = item.get("created_at", 0)
                pub_date = None
                if created_at:
                    try:
                        dt = datetime.fromtimestamp(created_at / 1000)
                        pub_date = dt.strftime("%Y-%m-%d")
                        if dt < datetime.now() - timedelta(days=35):
                            continue
                    except:
                        pass
                
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
# 数据源3: 百度资讯搜索（改进版）
# ──────────────────────────────────────────
async def crawl_baidu_news(client: httpx.AsyncClient) -> list[dict]:
    """百度资讯搜索"""
    articles = []
    
    search_terms = ["软通动力", "软通智慧", "软通动力 上市", "软通动力 AI"]
    
    for term in search_terms:
        url = f"https://www.baidu.com/s?wd={quote(term)}&tn=news&rtt=1&bsst=1&cl=2"
        
        try:
            html = await client.get(url, timeout=15).text
            soup = BeautifulSoup(html, "lxml")
            
            # 百度新闻结果
            result_items = soup.select(".result") or soup.select(".result-op")
            
            for item in result_items:
                title_tag = item.select_one("h3 a") or item.select_one("a[href]")
                if not title_tag:
                    continue
                
                title = clean_text(title_tag.get_text())
                href = title_tag.get("href", "")
                
                if not title or len(title) < 10:
                    continue
                
                # 提取来源和日期
                source = "百度资讯"
                date_text = ""
                
                info_tag = item.select_one(".c-color-gray") or item.select_one(".news-source")
                if info_tag:
                    info = clean_text(info_tag.get_text())
                    parts = info.split()
                    if parts:
                        source = parts[0]
                        # 查找日期
                        for part in parts:
                            if re.match(r'\d{4}', part):
                                date_match = re.search(r'\d{4}[-年]\d{1,2}[-月]\d{1,2}', part)
                                if date_match:
                                    date_text = date_match.group().replace("年", "-").replace("月", "-").replace("日", "")
                
                # 提取摘要
                content = ""
                content_tag = item.select_one(".c-abstract")
                if content_tag:
                    content = clean_text(content_tag.get_text())
                
                articles.append({
                    "title": title,
                    "url": href,
                    "source": source,
                    "publish_date": date_text or None,
                    "content": content
                })
            
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"[百度资讯] 搜索'{term}'失败: {e}")
    
    print(f"[百度资讯] 采集到 {len(articles)} 篇")
    return articles


# ──────────────────────────────────────────
# 数据源4: 搜狗新闻
# ──────────────────────────────────────────
async def crawl_sogou_news(client: httpx.AsyncClient) -> list[dict]:
    """搜狗新闻搜索"""
    articles = []
    
    url = f"https://news.sogou.com/news?query={quote('软通动力')}"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        items = soup.select(".news-list li") or soup.select(".vrwrap") or soup.select(".result")
        
        for item in items:
            title_tag = item.select_one("h3 a") or item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            
            # 提取摘要
            content = ""
            content_tag = item.select_one(".news-detail") or item.select_one("p")
            if content_tag:
                content = clean_text(content_tag.get_text())
            
            # 提取日期
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            articles.append({
                "title": title,
                "url": href if href.startswith("http") else f"https://news.sogou.com{href}",
                "source": "搜狗新闻",
                "publish_date": date_text or None,
                "content": content
            })
        
        print(f"[搜狗新闻] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[搜狗新闻] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源5: 财联社
# ──────────────────────────────────────────
async def crawl_cls(client: httpx.AsyncClient) -> list[dict]:
    """财联社电报"""
    articles = []
    
    # 财联社搜索
    url = f"https://www.cls.cn/search?keyword={quote('软通动力')}&type=news"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        items = soup.select(".search-result-item") or soup.select(".news-item") or soup.select("li")
        
        for item in items[:20]:
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
            
            # 提取内容
            content = ""
            content_tag = item.select_one("p") or item.select_one(".content")
            if content_tag:
                content = clean_text(content_tag.get_text())
            
            articles.append({
                "title": title,
                "url": urljoin("https://www.cls.cn/", href) if href.startswith("/") else href,
                "source": "财联社",
                "publish_date": date_text or None,
                "content": content
            })
        
        print(f"[财联社] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[财联社] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源6: 证券时报
# ──────────────────────────────────────────
async def crawl_stcn(client: httpx.AsyncClient) -> list[dict]:
    """证券时报"""
    articles = []
    
    url = f"https://so.stcn.com/?q={quote('软通动力')}&type=news"
    
    try:
        html = await client.get(url, timeout=15).text
        soup = BeautifulSoup(html, "lxml")
        
        items = soup.select(".search-result") or soup.select(".news-item") or soup.select("li")
        
        for item in items[:20]:
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
                "url": href,
                "source": "证券时报",
                "publish_date": date_text or None,
                "content": ""
            })
        
        print(f"[证券时报] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[证券时报] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 补充正文
# ──────────────────────────────────────────
async def enrich_content(client: httpx.AsyncClient, articles: list[dict]) -> list[dict]:
    """补充正文内容"""
    enriched = []
    
    for i, article in enumerate(articles):
        if len(article.get("content", "")) >= 150:
            enriched.append(article)
            continue
        
        url = article.get("url", "")
        if not url or not url.startswith("http"):
            enriched.append(article)
            continue
        
        try:
            resp = await client.get(url, timeout=10, follow_redirects=True)
            html = resp.text
            soup = BeautifulSoup(html, "lxml")
            
            # 多种正文选择器
            content_selectors = [
                ".article-content", ".news-content", ".content-body",
                ".detail-content", "article", ".post-content",
                "#article", ".text-content", ".main-content",
                ".article-body", ".news-body"
            ]
            
            content = ""
            for selector in content_selectors:
                tags = soup.select(selector)
                if tags:
                    content = clean_text(tags[0].get_text())
                    if len(content) > 200:
                        break
            
            if content:
                article["content"] = content[:2000]
                print(f"[补充正文] {i+1}/{len(articles)}: {article['title'][:30]} -> {len(content)}字")
            
            await asyncio.sleep(0.3)
        except Exception as e:
            pass
        
        enriched.append(article)
    
    return enriched


# ──────────────────────────────────────────
# 主入口
# ──────────────────────────────────────────
async def crawl_all_news() -> list[dict]:
    """执行全部爬虫"""
    all_articles = []
    
    async with httpx.AsyncClient(headers=HEADERS, verify=False, timeout=20) as client:
        print("[Crawler V3] 开始采集软通动力新闻...")
        
        tasks = [
            ("东方财富", crawl_eastmoney(client)),
            ("雪球", crawl_xueqiu(client)),
            ("百度资讯", crawl_baidu_news(client)),
            ("搜狗新闻", crawl_sogou_news(client)),
            ("财联社", crawl_cls(client)),
            ("证券时报", crawl_stcn(client)),
        ]
        
        results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        
        for (name, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                print(f"[{name}] 异常: {result}")
            elif isinstance(result, list):
                all_articles.extend(result)
    
    # 去重
    seen = set()
    unique = []
    for a in all_articles:
        key = a["title"].strip()[:40]
        if key not in seen:
            seen.add(key)
            unique.append(a)
    
    # 补充正文
    print(f"\n[Crawler V3] 开始补充正文 ({len(unique)}篇)...")
    async with httpx.AsyncClient(headers=HEADERS, verify=False, timeout=15) as client:
        unique = await enrich_content(client, unique)
    
    # 过滤有效内容
    valid = [a for a in unique if len(a.get("content", "")) >= 50 or "软通" in a["title"]]
    
    print(f"\n[Crawler V3] 完成: 总计{len(all_articles)}篇 -> 去重{len(unique)}篇 -> 有效{len(valid)}篇")
    return valid


if __name__ == "__main__":
    articles = asyncio.run(crawl_all_news())
    print(f"\n{'='*60}")
    print(f"共采集 {len(articles)} 篇有效文章")
    print(f"{'='*60}")
    
    for a in articles[:15]:
        print(f"\n【{a['source']}】{a['title'][:50]}")
        print(f"  日期: {a.get('publish_date', 'N/A')} | 内容: {len(a.get('content', ''))}字")
        print(f"  URL: {a['url'][:70]}")

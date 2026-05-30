"""
软通新闻智能整理器 - 简化爬虫
使用requests同步方式，稳定可靠
"""
import requests
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime, timedelta
from urllib.parse import quote, urljoin
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'<[^>]+>', '', text)
    return text


# ──────────────────────────────────────────
# 数据源1: 雪球搜索
# ──────────────────────────────────────────
def crawl_xueqiu() -> list[dict]:
    """雪球搜索软通动力"""
    articles = []
    session = requests.Session()
    session.headers.update(HEADERS)
    
    try:
        # 获取cookie
        session.get("https://xueqiu.com/", timeout=10)
        
        # 搜索API
        url = "https://xueqiu.com/query/v1/search/status.json"
        params = {"q": "软通动力", "count": 50, "page": 1, "sort": "time"}
        
        resp = session.get(url, params=params, timeout=15)
        data = resp.json()
        
        if data.get("list"):
            for item in data["list"]:
                title = item.get("title", "") or item.get("text", "")[:100]
                text_content = item.get("text", "")
                
                # 必须包含软通动力
                if "软通动力" not in title and "软通动力" not in text_content:
                    continue
                
                created_at = item.get("created_at", 0)
                pub_date = None
                if created_at:
                    try:
                        dt = datetime.fromtimestamp(created_at / 1000)
                        pub_date = dt.strftime("%Y-%m-%d")
                        # 过滤30天外
                        if dt < datetime.now() - timedelta(days=35):
                            continue
                    except:
                        pass
                
                articles.append({
                    "title": clean_text(title[:80]),
                    "url": f"https://xueqiu.com/{item.get('user', {}).get('id', '')}/{item.get('id', '')}",
                    "source": "雪球",
                    "publish_date": pub_date,
                    "content": clean_text(text_content)[:500]
                })
        
        print(f"[雪球] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[雪球] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源2: 东方财富
# ──────────────────────────────────────────
def crawl_eastmoney() -> list[dict]:
    """东方财富个股新闻"""
    articles = []
    
    try:
        # 东方财富新闻列表API
        url = "https://np-listapi.eastmoney.com/comm/web/getListInfo"
        params = {
            "type": "106",
            "code": "301236",  # 软通动力
            "pageSize": 50,
            "pageNo": 1,
        }
        
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        data = resp.json()
        
        if data.get("data") and data["data"].get("list"):
            for item in data["data"]["list"]:
                title = item.get("title", "")
                if not title:
                    continue
                
                pub_time = item.get("pub_time", "")
                pub_date = None
                if pub_time:
                    try:
                        dt = datetime.fromtimestamp(int(pub_time))
                        pub_date = dt.strftime("%Y-%m-%d")
                        if dt < datetime.now() - timedelta(days=35):
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
# 数据源3: 百度资讯
# ──────────────────────────────────────────
def crawl_baidu() -> list[dict]:
    """百度资讯搜索"""
    articles = []
    
    for term in ["软通动力", "软通智慧", "chinasofti"]:
        try:
            url = f"https://www.baidu.com/s?wd={quote(term)}&tn=news&rtt=1&bsst=1&cl=2&medium=0"
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "lxml")
            
            items = soup.select(".result") + soup.select(".result-op")
            
            for item in items:
                title_tag = item.select_one("h3 a") or item.select_one("a[href]")
                if not title_tag:
                    continue
                
                title = clean_text(title_tag.get_text())
                href = title_tag.get("href", "")
                
                if not title or len(title) < 10:
                    continue
                
                # 提取来源
                source = "百度资讯"
                source_tag = item.select_one(".c-color-gray")
                if source_tag:
                    src = clean_text(source_tag.get_text())
                    parts = src.split()
                    if parts:
                        source = parts[0]
                
                # 提取日期
                date_text = ""
                date_match = re.search(r'(\d{4})[-年](\d{1,2})[-月](\d{1,2})', str(item))
                if date_match:
                    date_text = f"{date_match.group(1)}-{date_match.group(2).zfill(2)}-{date_match.group(3).zfill(2)}"
                
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
            
            time.sleep(0.5)
        except Exception as e:
            print(f"[百度] 搜索'{term}'失败: {e}")
    
    print(f"[百度资讯] 采集到 {len(articles)} 篇")
    return articles


# ──────────────────────────────────────────
# 数据源4: 同花顺
# ──────────────────────────────────────────
def crawl_10jqka() -> list[dict]:
    """同花顺"""
    articles = []
    
    try:
        url = "https://stockpage.10jqka.com.cn/301236/"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "lxml")
        
        items = soup.select(".news-item") + soup.select(".stock-news li")
        
        for item in items[:30]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            
            date_text = ""
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(item))
            if date_match:
                date_text = date_match.group().replace("/", "-")
            
            articles.append({
                "title": title,
                "url": urljoin(url, href),
                "source": "同花顺",
                "publish_date": date_text or None,
                "content": ""
            })
        
        print(f"[同花顺] 采集到 {len(articles)} 篇")
    except Exception as e:
        print(f"[同花顺] 失败: {e}")
    
    return articles


# ──────────────────────────────────────────
# 数据源5: 网易财经
# ──────────────────────────────────────────
def crawl_netease() -> list[dict]:
    """网易财经"""
    articles = []
    
    try:
        url = f"https://money.163.com/keyword/{quote('软通动力')}.html"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "lxml")
        
        items = soup.select(".news-item") + soup.select(".item")
        
        for item in items[:25]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            
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
# 数据源6: 新浪财经
# ──────────────────────────────────────────
def crawl_sina() -> list[dict]:
    """新浪财经"""
    articles = []
    
    try:
        url = f"https://search.sina.com.cn/?q={quote('软通动力')}&c=news&from=channel"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "lxml")
        
        items = soup.select(".result") + soup.select(".news-item")
        
        for item in items[:25]:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 10:
                continue
            
            content = ""
            content_tag = item.select_one("p") or item.select_one(".content")
            if content_tag:
                content = clean_text(content_tag.get_text())
            
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
# 补充正文
# ──────────────────────────────────────────
def enrich_content(articles: list[dict]) -> list[dict]:
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
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "lxml")
            
            content_selectors = [
                ".article-content", ".news-content", ".content-body",
                "article", ".post-content", ".text-content",
                ".article-body", ".news-body", "main"
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
            
            time.sleep(0.2)
        except:
            pass
        
        enriched.append(article)
        
        if (i + 1) % 10 == 0:
            print(f"[补充正文] 进度: {i+1}/{len(articles)}")
    
    return enriched


# ──────────────────────────────────────────
# 主入口
# ──────────────────────────────────────────
def crawl_all_news() -> list[dict]:
    """执行所有爬虫"""
    all_articles = []
    
    print("[Crawler] 开始采集软通动力新闻...")
    print("=" * 50)
    
    # 执行各爬虫
    crawlers = [
        ("雪球", crawl_xueqiu),
        ("东方财富", crawl_eastmoney),
        ("百度资讯", crawl_baidu),
        ("同花顺", crawl_10jqka),
        ("网易财经", crawl_netease),
        ("新浪财经", crawl_sina),
    ]
    
    for name, crawler in crawlers:
        try:
            articles = crawler()
            all_articles.extend(articles)
        except Exception as e:
            print(f"[{name}] 异常: {e}")
        time.sleep(0.5)
    
    # 去重
    seen = set()
    unique = []
    for a in all_articles:
        key = a["title"].strip()[:40]
        if key not in seen:
            seen.add(key)
            unique.append(a)
    
    print("=" * 50)
    print(f"[去重] 总计{len(all_articles)}篇 -> 去重后{len(unique)}篇")
    
    # 补充正文
    print("\n[补充正文] 开始...")
    unique = enrich_content(unique)
    
    # 过滤有效内容
    valid = [a for a in unique if len(a.get("content", "")) >= 50 or "软通" in a["title"]]
    
    print("=" * 50)
    print(f"[完成] 有效文章: {len(valid)}篇")
    
    return valid


if __name__ == "__main__":
    articles = crawl_all_news()
    
    print(f"\n{'='*60}")
    print(f"共采集 {len(articles)} 篇有效文章")
    print(f"{'='*60}")
    
    for a in articles[:20]:
        print(f"\n【{a['source']}】{a['title'][:50]}")
        print(f"  日期: {a.get('publish_date', 'N/A')} | 内容: {len(a.get('content', ''))}字")

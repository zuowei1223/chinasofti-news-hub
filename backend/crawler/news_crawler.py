"""
软通新闻智能整理器 - 新闻爬虫
多源采集软通动力近30天新闻
"""
import httpx
import asyncio
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urljoin, quote

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


async def fetch_page(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """获取页面HTML"""
    try:
        resp = await client.get(url, follow_redirects=True, timeout=30)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"[Crawler] Failed to fetch {url}: {e}")
        return None


def clean_text(text: str) -> str:
    """清理文本"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ──────────────────────────────────────────
# 爬虫 1: 软通动力官网新闻
# ──────────────────────────────────────────
async def crawl_chinasofti_official(client: httpx.AsyncClient) -> list[dict]:
    """爬取软通动力官网新闻中心"""
    articles = []
    base_url = "https://www.chinasofti.com"

    # 尝试多个新闻列表页URL
    news_urls = [
        f"{base_url}/news/",
        f"{base_url}/news/company/",
        f"{base_url}/news/industry/",
        f"{base_url}/about/news/",
        f"{base_url}/newscenter/",
    ]

    for list_url in news_urls:
        html = await fetch_page(client, list_url)
        if not html:
            continue

        soup = BeautifulSoup(html, "lxml")
        # 尝试多种常见的新闻列表选择器
        links = (
            soup.select("a[href*='news']") +
            soup.select("a[href*='article']") +
            soup.select(".news-list a") +
            soup.select(".news-list-item a") +
            soup.select(".article-list a") +
            soup.select("ul.list li a") +
            soup.select(".content-list a")
        )

        seen = set()
        for link in links:
            href = link.get("href", "")
            if not href or href in seen or href == "#":
                continue
            seen.add(href)

            title = clean_text(link.get_text())
            if len(title) < 6:  # 过滤太短的标题
                continue

            full_url = urljoin(list_url, href)
            if full_url in [a.get("url") for a in articles]:
                continue

            # 尝试获取日期
            date_text = ""
            parent = link.parent
            for _ in range(3):
                if parent:
                    date_span = parent.find(string=re.compile(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}'))
                    if date_span:
                        date_text = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', str(date_span))
                        date_text = date_text.group().replace("/", "-") if date_text else ""
                        break
                    parent = parent.parent

            articles.append({
                "title": title,
                "url": full_url,
                "source": "软通动力官网",
                "publish_date": date_text or None,
                "content": ""
            })

    # 爬取文章详情
    for article in articles:
        if article["content"]:
            continue
        html = await fetch_page(client, article["url"])
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        # 提取正文
        content_tags = (
            soup.select(".article-content") or
            soup.select(".news-content") or
            soup.select(".content-body") or
            soup.select(".detail-content") or
            soup.select("article .content") or
            soup.select("article")
        )
        if content_tags:
            article["content"] = clean_text(content_tags[0].get_text())
        else:
            # fallback: 取最长的段落集合
            paragraphs = soup.select("p")
            if paragraphs:
                article["content"] = clean_text(" ".join(p.get_text() for p in paragraphs[:20]))

        # 如果没有日期，尝试从详情页提取
        if not article["publish_date"]:
            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', html)
            if date_match:
                article["publish_date"] = date_match.group().replace("/", "-")

        await asyncio.sleep(0.3)  # 礼貌性延迟

    return articles


# ──────────────────────────────────────────
# 爬虫 2: 百度新闻搜索
# ──────────────────────────────────────────
async def crawl_baidu_news(client: httpx.AsyncClient) -> list[dict]:
    """通过百度新闻搜索采集软通动力相关新闻"""
    articles = []
    search_terms = ["软通动力", "软通智慧", "chinasofti", "软通动力 AI"]
    
    for term in search_terms:
        url = f"https://www.baidu.com/s?wd={quote(term)}&tn=news&rtt=1&bsst=1&cl=2&medium=0"
        html = await fetch_page(client, url)
        if not html:
            continue
        
        soup = BeautifulSoup(html, "lxml")
        
        # 百度新闻搜索结果
        result_items = (
            soup.select(".result-op") or
            soup.select(".result") or
            soup.select("div[tpl]")
        )
        
        for item in result_items:
            title_tag = item.select_one("h3 a") or item.select_one("a[href]")
            if not title_tag:
                continue
            
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            
            if not title or len(title) < 6:
                continue
            
            # 提取日期
            date_text = ""
            date_span = item.find(string=re.compile(r'\d{1,2}[小时天分钟秒月年]+前|\d{4}[年\-]\d{1,2}[月\-]\d{1,2}'))
            if date_span:
                date_match = re.search(r'\d{4}[-年]\d{1,2}[-月]\d{1,2}', str(date_span))
                if date_match:
                    date_text = date_match.group().replace("年", "-").replace("月", "-").replace("日", "")

            # 提取摘要
            content = ""
            content_tag = item.select_one(".c-span-last") or item.select_one(".c-abstract")
            if content_tag:
                content = clean_text(content_tag.get_text())

            # 提取来源
            source = "百度新闻"
            source_tag = item.select_one(".c-color-gray") or item.select_one(".news-source")
            if source_tag:
                src = clean_text(source_tag.get_text())
                if src:
                    source = src.split()[0] if src else source

            articles.append({
                "title": title,
                "url": href,
                "source": source,
                "publish_date": date_text or None,
                "content": content
            })
        
        await asyncio.sleep(1)

    return articles


# ──────────────────────────────────────────
# 爬虫 3: 搜狐/新浪等媒体搜索
# ──────────────────────────────────────────
async def crawl_sogou_news(client: httpx.AsyncClient) -> list[dict]:
    """通过搜狗新闻搜索采集"""
    articles = []
    
    url = f"https://news.sogou.com/news?query={quote('软通动力')}&sort=1"  # sort=1 按时间
    html = await fetch_page(client, url)
    if not html:
        return articles
    
    soup = BeautifulSoup(html, "lxml")
    
    result_items = soup.select(".news-list li") or soup.select(".results .vrwrap") or soup.select(".result")
    
    for item in result_items:
        title_tag = item.select_one("h3 a") or item.select_one(".news-title a") or item.select_one("a")
        if not title_tag:
            continue
        
        title = clean_text(title_tag.get_text())
        href = title_tag.get("href", "")
        if not title or len(title) < 6:
            continue
        
        content = ""
        content_tag = item.select_one(".news-detail") or item.select_one("p")
        if content_tag:
            content = clean_text(content_tag.get_text())
        
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

    return articles


# ──────────────────────────────────────────
# 爬虫 4: 36kr / IT之家等科技媒体
# ──────────────────────────────────────────
async def crawl_tech_news(client: httpx.AsyncClient) -> list[dict]:
    """从36kr等科技媒体搜索软通动力相关新闻"""
    articles = []
    
    # 36kr搜索
    url = f"https://www.36kr.com/search/articles/{quote('软通动力')}"
    html = await fetch_page(client, url)
    if html:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select(".search-article-item") or soup.select(".article-item")
        for item in items:
            title_tag = item.select_one("a[class*='title']") or item.select_one("a")
            if not title_tag:
                continue
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            if not title or len(title) < 6:
                continue
            content = ""
            content_tag = item.select_one(".article-item-desc") or item.select_one("p")
            if content_tag:
                content = clean_text(content_tag.get_text())
            articles.append({
                "title": title,
                "url": f"https://www.36kr.com{href}" if href.startswith("/") else href,
                "source": "36氪",
                "publish_date": None,
                "content": content
            })

    # IT之家搜索
    url2 = f"https://www.ithome.com/search?word={quote('软通动力')}"
    html2 = await fetch_page(client, url2)
    if html2:
        soup2 = BeautifulSoup(html2, "lxml")
        items2 = soup2.select(".search-result-item") or soup2.select(".item")
        for item in items2:
            title_tag = item.select_one("a")
            if not title_tag:
                continue
            title = clean_text(title_tag.get_text())
            href = title_tag.get("href", "")
            if not title or len(title) < 6:
                continue
            content = ""
            content_tag = item.select_one("p") or item.select_one(".desc")
            if content_tag:
                content = clean_text(content_tag.get_text())
            articles.append({
                "title": title,
                "url": href if href.startswith("http") else f"https://www.ithome.com{href}",
                "source": "IT之家",
                "publish_date": None,
                "content": content
            })

    return articles


# ──────────────────────────────────────────
# 主爬虫入口
# ──────────────────────────────────────────
async def crawl_all_news() -> list[dict]:
    """执行全部爬虫，返回去重后的新闻列表"""
    all_articles = []
    
    async with httpx.AsyncClient(headers=HEADERS, verify=False) as client:
        print("[Crawler] 开始采集软通动力新闻...")
        
        # 并发执行所有爬虫
        tasks = [
            ("官网", crawl_chinasofti_official(client)),
            ("百度新闻", crawl_baidu_news(client)),
            ("搜狗新闻", crawl_sogou_news(client)),
            ("科技媒体", crawl_tech_news(client)),
        ]
        
        results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        
        for (name, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                print(f"[Crawler] {name} 爬取失败: {result}")
            else:
                print(f"[Crawler] {name} 采集到 {len(result)} 篇")
                all_articles.extend(result)
    
    # 去重（按URL和标题）
    seen_urls = set()
    seen_titles = set()
    unique = []
    for a in all_articles:
        key_url = a.get("url", "").rstrip("/")
        key_title = a["title"].strip()[:30]
        if key_url not in seen_urls and key_title not in seen_titles:
            seen_urls.add(key_url)
            seen_titles.add(key_title)
            unique.append(a)

    # 过滤30天内的新闻
    cutoff = (datetime.now() - timedelta(days=35)).strftime("%Y-%m-%d")
    recent = []
    for a in unique:
        if a.get("publish_date"):
            try:
                if a["publish_date"] >= cutoff:
                    recent.append(a)
            except:
                recent.append(a)
        else:
            recent.append(a)  # 没有日期的也保留
    
    print(f"[Crawler] 总计采集 {len(all_articles)} 篇，去重后 {len(unique)} 篇，近30天 {len(recent)} 篇")
    return recent


async def enrich_article_content(articles: list[dict]) -> list[dict]:
    """对只有摘要没有正文的文章，补充爬取正文"""
    async with httpx.AsyncClient(headers=HEADERS, verify=False, timeout=20) as client:
        for article in articles:
            if not article.get("content") or len(article.get("content", "")) < 50:
                if not article.get("url") or not article["url"].startswith("http"):
                    continue
                html = await fetch_page(client, article["url"])
                if html:
                    soup = BeautifulSoup(html, "lxml")
                    content_tags = (
                        soup.select(".article-content") or
                        soup.select(".news-content") or
                        soup.select(".content-body") or
                        soup.select("article") or
                        soup.select("main")
                    )
                    if content_tags:
                        article["content"] = clean_text(content_tags[0].get_text())
                    if not article.get("publish_date"):
                        date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', html)
                        if date_match:
                            article["publish_date"] = date_match.group().replace("/", "-")
                await asyncio.sleep(0.5)
    return articles


if __name__ == "__main__":
    articles = asyncio.run(crawl_all_news())
    for a in articles[:5]:
        print(f"\n--- {a['title']} ---")
        print(f"URL: {a['url']}")
        print(f"Date: {a.get('publish_date', 'N/A')}")
        print(f"Source: {a.get('source', 'N/A')}")
        print(f"Content preview: {a.get('content', '')[:100]}...")

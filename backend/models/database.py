"""
软通新闻智能整理器 - 数据库操作
"""
import aiosqlite
import json
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "news.db"


async def clear_db():
    """清空数据库"""
    db = await get_db()
    try:
        await db.execute("DELETE FROM news")
        await db.commit()
    finally:
        await db.close()


async def get_db():
    """获取数据库连接"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """初始化数据库表"""
    db = await get_db()
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                source TEXT DEFAULT '',
                url TEXT DEFAULT '',
                content TEXT DEFAULT '',
                publish_date TEXT,
                crawled_at TEXT DEFAULT (datetime('now')),
                summary TEXT DEFAULT '',
                category TEXT DEFAULT '其他',
                keywords TEXT DEFAULT '[]',
                sentiment TEXT DEFAULT '中性',
                importance_score REAL DEFAULT 0.5,
                UNIQUE(url)
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news(publish_date)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news(sentiment)
        """)
        
        # 定时任务配置表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scheduler_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key TEXT UNIQUE NOT NULL,
                config_value TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        
        # 抓取历史表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS crawl_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'success',
                crawled INTEGER DEFAULT 0,
                saved INTEGER DEFAULT 0,
                new_articles INTEGER DEFAULT 0,
                sources TEXT DEFAULT '[]',
                message TEXT DEFAULT ''
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_crawl_history_timestamp ON crawl_history(timestamp)
        """)
        
        await db.commit()
    finally:
        await db.close()


async def insert_article(article: dict) -> Optional[int]:
    """插入单条新闻"""
    db = await get_db()
    try:
        keywords = json.dumps(article.get("keywords", []), ensure_ascii=False)
        cursor = await db.execute("""
            INSERT OR IGNORE INTO news 
            (title, source, url, content, publish_date, summary, category, keywords, sentiment, importance_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            article["title"], article.get("source", ""), article.get("url", ""),
            article.get("content", ""), article.get("publish_date"),
            article.get("summary", ""), article.get("category", "其他"),
            keywords, article.get("sentiment", "中性"),
            article.get("importance_score", 0.5)
        ))
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def insert_articles_batch(articles: list[dict]) -> int:
    """批量插入新闻，返回成功插入数量"""
    count = 0
    db = await get_db()
    try:
        for article in articles:
            keywords = json.dumps(article.get("keywords", []), ensure_ascii=False)
            try:
                await db.execute("""
                    INSERT OR IGNORE INTO news 
                    (title, source, url, content, publish_date, summary, category, keywords, sentiment, importance_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    article["title"], article.get("source", ""), article.get("url", ""),
                    article.get("content", ""), article.get("publish_date"),
                    article.get("summary", ""), article.get("category", "其他"),
                    keywords, article.get("sentiment", "中性"),
                    article.get("importance_score", 0.5)
                ))
                count += 1
            except Exception:
                continue
        await db.commit()
        return count
    finally:
        await db.close()


async def query_news(
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    sentiment: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = "publish_date",
    sort_order: str = "desc"
) -> dict:
    """查询新闻列表"""
    db = await get_db()
    try:
        conditions = []
        params = []

        if category:
            conditions.append("category = ?")
            params.append(category)
        if keyword:
            conditions.append("(title LIKE ? OR content LIKE ? OR summary LIKE ?)")
            kw = f"%{keyword}%"
            params.extend([kw, kw, kw])
        if sentiment:
            conditions.append("sentiment = ?")
            params.append(sentiment)
        if start_date:
            conditions.append("publish_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("publish_date <= ?")
            params.append(end_date)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Count
        count_row = await db.execute(f"SELECT COUNT(*) FROM news {where}", params)
        total = (await count_row.fetchone())[0]

        # Query
        valid_sorts = {"publish_date", "importance_score", "crawled_at", "title"}
        sort_col = sort_by if sort_by in valid_sorts else "publish_date"
        order = "DESC" if sort_order.lower() == "desc" else "ASC"
        offset = (page - 1) * page_size

        rows = await db.execute(
            f"SELECT * FROM news {where} ORDER BY {sort_col} {order} LIMIT ? OFFSET ?",
            params + [page_size, offset]
        )
        articles = [dict(row) for row in await rows.fetchall()]

        # Parse keywords JSON
        for a in articles:
            try:
                a["keywords"] = json.loads(a.get("keywords", "[]"))
            except (json.JSONDecodeError, TypeError):
                a["keywords"] = []

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "articles": articles
        }
    finally:
        await db.close()


async def get_article(article_id: int) -> Optional[dict]:
    """获取单条新闻详情"""
    db = await get_db()
    try:
        row = await db.execute("SELECT * FROM news WHERE id = ?", (article_id,))
        result = await row.fetchone()
        if result:
            article = dict(result)
            try:
                article["keywords"] = json.loads(article.get("keywords", "[]"))
            except (json.JSONDecodeError, TypeError):
                article["keywords"] = []
            return article
        return None
    finally:
        await db.close()


async def get_stats() -> dict:
    """获取仪表盘统计数据"""
    db = await get_db()
    try:
        # Total
        total_row = await db.execute("SELECT COUNT(*) FROM news")
        total = (await total_row.fetchone())[0]

        # Category distribution
        cat_rows = await db.execute(
            "SELECT category, COUNT(*) as count FROM news GROUP BY category ORDER BY count DESC"
        )
        category_dist = {row["category"]: row["count"] for row in await cat_rows.fetchall()}

        # Sentiment distribution
        sent_rows = await db.execute(
            "SELECT sentiment, COUNT(*) as count FROM news GROUP BY sentiment"
        )
        sentiment_dist = {row["sentiment"]: row["count"] for row in await sent_rows.fetchall()}

        # Daily trend (last 30 days)
        trend_rows = await db.execute("""
            SELECT publish_date as date, COUNT(*) as count 
            FROM news 
            WHERE publish_date IS NOT NULL
            GROUP BY publish_date 
            ORDER BY publish_date DESC 
            LIMIT 30
        """)
        daily_trend = [{"date": row["date"], "count": row["count"]} for row in await trend_rows.fetchall()]

        # Top keywords (aggregate from all articles)
        kw_rows = await db.execute("SELECT keywords FROM news WHERE keywords != '[]'")
        keyword_counts = {}
        for row in await kw_rows.fetchall():
            try:
                for kw in json.loads(row["keywords"]):
                    keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
            except (json.JSONDecodeError, TypeError):
                continue
        top_keywords = sorted(
            [{"keyword": k, "count": v} for k, v in keyword_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:30]

        # Date range
        range_row = await db.execute("""
            SELECT MIN(publish_date) as min_date, MAX(publish_date) as max_date FROM news
            WHERE publish_date IS NOT NULL
        """)
        r = await range_row.fetchone()
        date_range = {"start": r["min_date"], "end": r["max_date"]} if r["min_date"] else {"start": "", "end": ""}

        return {
            "total_articles": total,
            "category_distribution": category_dist,
            "sentiment_distribution": sentiment_dist,
            "daily_trend": daily_trend,
            "top_keywords": top_keywords,
            "date_range": date_range
        }
    finally:
        await db.close()


# ──────────────────────────────────────────
# 抓取历史管理
# ──────────────────────────────────────────

async def add_crawl_history(record: dict):
    """添加抓取历史记录"""
    db = await get_db()
    try:
        await db.execute("""
            INSERT INTO crawl_history (timestamp, status, crawled, saved, new_articles, sources, message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("timestamp", datetime.now().isoformat()),
            record.get("status", "success"),
            record.get("crawled", 0),
            record.get("saved", 0),
            record.get("new_articles", 0),
            json.dumps(record.get("sources", []), ensure_ascii=False),
            record.get("message", "")
        ))
        await db.commit()
    finally:
        await db.close()


async def get_crawl_history(limit: int = 50) -> list:
    """获取抓取历史"""
    db = await get_db()
    try:
        rows = await db.execute("""
            SELECT * FROM crawl_history ORDER BY timestamp DESC LIMIT ?
        """, (limit,))
        history = []
        for row in await rows.fetchall():
            record = dict(row)
            try:
                record["sources"] = json.loads(record.get("sources", "[]"))
            except (json.JSONDecodeError, TypeError):
                record["sources"] = []
            history.append(record)
        return history
    finally:
        await db.close()


# ──────────────────────────────────────────
# 统计：新增文章数
# ──────────────────────────────────────────

async def count_articles_since(since_date: str) -> int:
    """统计指定日期以来的新增文章数"""
    db = await get_db()
    try:
        row = await db.execute(
            "SELECT COUNT(*) as count FROM news WHERE crawled_at >= ?",
            (since_date,)
        )
        result = await row.fetchone()
        return result["count"] if result else 0
    finally:
        await db.close()


# ──────────────────────────────────────────
# 周报管理
# ──────────────────────────────────────────

async def init_weekly_reports_table():
    """初始化周报表"""
    db = await get_db()
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS weekly_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                article_count INTEGER DEFAULT 0,
                new_this_week INTEGER DEFAULT 0,
                week_start TEXT,
                week_end TEXT,
                generated_at TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated_at ON weekly_reports(generated_at)
        """)
        await db.commit()
    finally:
        await db.close()


async def save_weekly_report(report: dict) -> int:
    """保存周报，返回ID"""
    db = await get_db()
    try:
        cursor = await db.execute("""
            INSERT INTO weekly_reports 
            (title, content, article_count, new_this_week, week_start, week_end, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            report.get("title", "新闻周报"),
            report.get("content", ""),
            report.get("article_count", 0),
            report.get("new_this_week", 0),
            report.get("week_start"),
            report.get("week_end"),
            report.get("generated_at", datetime.now().isoformat())
        ))
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def get_weekly_reports(limit: int = 20) -> list:
    """获取周报历史列表"""
    db = await get_db()
    try:
        rows = await db.execute("""
            SELECT id, title, article_count, new_this_week, week_start, week_end, generated_at
            FROM weekly_reports ORDER BY generated_at DESC LIMIT ?
        """, (limit,))
        return [dict(row) for row in await rows.fetchall()]
    finally:
        await db.close()


async def get_weekly_report(report_id: int) -> Optional[dict]:
    """获取单份周报详情"""
    db = await get_db()
    try:
        row = await db.execute("SELECT * FROM weekly_reports WHERE id = ?", (report_id,))
        result = await row.fetchone()
        return dict(result) if result else None
    finally:
        await db.close()


from datetime import datetime

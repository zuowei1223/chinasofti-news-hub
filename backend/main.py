"""
软通新闻智能整理器 - FastAPI后端
支持：多任务定时抓取、多源采集、AI分析
"""
import os
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

# 加载.env环境变量
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import json
import time

from models.database import (
    init_db, query_news, get_article, get_stats,
    insert_articles_batch, clear_db, get_crawl_history,
    add_crawl_history, count_articles_since
)
from models.schemas import NewsListResponse, DashboardStats, NewsArticle
from crawler.preset_data import get_preset_news
from crawler.multi_source import crawl_all
from ai.pipeline import AIPipeline
from scheduler.scheduler import (
    scheduler, load_tasks, save_tasks, load_history,
    make_task, ALL_SOURCES, ALL_CATEGORIES
)

# 全局AI管线
ai_pipeline = AIPipeline()


# ──────────────────────────────────────────
# 多任务抓取回调
# ──────────────────────────────────────────

async def task_crawl_callback(
    keywords: list = None,
    categories: list = None,
    sources: list = None,
):
    """单个任务的抓取回调（无AI处理，增量/全量用RSS，预置数据用preset）"""
    # 构造抓取配置
    # 如果任务指定了 sources，使用任务的配置；否则默认 RSS + preset
    if sources:
        # 任务配置优先（定时任务场景）
        sources_cfg = {s: True for s in sources if s in ["rss", "preset"]}
    else:
        # 默认配置（手动触发场景）
        sources_cfg = {"rss": True, "preset": True}
    
    cfg = {
        "focus_keywords": keywords or [],
        "focus_categories": categories or [],
        "sources": sources_cfg,
    }

    # 多源抓取
    result = await crawl_all(cfg)
    articles = result.get("articles", [])

    if not articles:
        return {"crawled": 0, "saved": 0, "new_articles": 0, "message": "未抓取到新闻", "sources": []}

    # 直接存入数据库（无AI处理）
    count = await insert_articles_batch(articles)

    return {
        "crawled": result.get("crawled", 0),
        "saved": count,
        "new_articles": count,
        "sources": result.get("sources", []),
        "message": "抓取完成",
    }


# ──────────────────────────────────────────
# 应用生命周期
# ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("[App] 数据库初始化完成")

    # 初始化周报表
    from models.database import init_weekly_reports_table
    await init_weekly_reports_table()
    print("[App] 周报表初始化完成")

    # 启动多任务调度器
    scheduler.start(task_crawl_callback)
    print("[App] 多任务调度器已启动")

    yield

    scheduler.stop()
    print("[App] 调度器已关闭")


app = FastAPI(
    title="软通新闻智能整理器",
    description="自动采集、AI分析、可视化展示软通动力近30天新闻",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────
# 基础API
# ──────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "软通新闻智能整理器", "version": "3.0.0"}


@app.get("/api/news", response_model=NewsListResponse)
async def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str = Query(None),
    keyword: str = Query(None),
    sentiment: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    sort_by: str = Query("publish_date"),
    sort_order: str = Query("desc"),
):
    result = await query_news(
        page=page, page_size=page_size,
        category=category, keyword=keyword,
        sentiment=sentiment,
        start_date=start_date, end_date=end_date,
        sort_by=sort_by, sort_order=sort_order,
    )
    return result


@app.get("/api/news/{article_id}")
async def get_news_detail(article_id: int):
    article = await get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    return article


@app.get("/api/dashboard")
async def dashboard():
    stats = await get_stats()
    today = datetime.now().strftime("%Y-%m-%d")
    stats["new_today"] = await count_articles_since(today)
    return stats


@app.get("/api/categories")
async def get_categories():
    from models.database import get_db
    db = await get_db()
    try:
        rows = await db.execute("SELECT DISTINCT category FROM news ORDER BY category")
        categories = [row["category"] for row in await rows.fetchall()]
        return {"categories": categories}
    finally:
        await db.close()


# ──────────────────────────────────────────
# 抓取API
# ──────────────────────────────────────────

@app.post("/api/crawl")
async def trigger_crawl(body: dict = Body(default={})):
    """手动触发抓取（无进度显示，兼容旧接口）"""
    try:
        mode = body.get("mode", "incremental")
        if mode == "full":
            await clear_db()

        result = await task_crawl_callback()
        return {"status": "ok", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/crawl/stream")
async def trigger_crawl_stream(body: dict = Body(default={})):
    """SSE流式抓取，实时推送进度"""
    mode = body.get("mode", "incremental")
    
    async def generate_progress():
        start_time = time.time()
        
        # 发送开始事件
        yield f"data: {json.dumps({'event': 'start', 'mode': mode, 'message': f'开始{mode}抓取...'}, ensure_ascii=False)}\n\n"
        
        # 清空数据库（全量模式）
        if mode == "full":
            yield f"data: {json.dumps({'event': 'progress', 'step': 'clear', 'message': '清空数据库...'}, ensure_ascii=False)}\n\n"
            await clear_db()
        
        # 构造抓取配置
        config = {
            "mode": mode,
            "sources": {"preset": True},  # 演示只用预置数据
        }
        
        # 抓取阶段
        yield f"data: {json.dumps({'event': 'progress', 'step': 'crawl', 'source': 'preset', 'message': '正在抓取预置数据...'}, ensure_ascii=False)}\n\n"
        
        try:
            result = await crawl_all(config)
            articles = result.get("articles", [])
            crawled = result.get("crawled", 0)
            sources = result.get("sources", [])
            
            yield f"data: {json.dumps({'event': 'progress', 'step': 'crawled', 'count': crawled, 'sources': sources, 'message': f'抓取到 {crawled} 篇文章'}, ensure_ascii=False)}\n\n"
            
            if not articles:
                yield f"data: {json.dumps({'event': 'done', 'saved': 0, 'elapsed': round(time.time() - start_time, 1), 'message': '未抓取到文章'}, ensure_ascii=False)}\n\n"
                return
            
            # 直接存入数据库（无AI处理）
            yield f"data: {json.dumps({'event': 'progress', 'step': 'save', 'message': f'保存 {len(articles)} 篇文章...'}, ensure_ascii=False)}\n\n"
            count = await insert_articles_batch(articles)
            
            elapsed = round(time.time() - start_time, 1)
            yield f"data: {json.dumps({'event': 'done', 'crawled': crawled, 'saved': count, 'sources': sources, 'elapsed': elapsed, 'message': f'完成！保存 {count} 篇，耗时 {elapsed}秒'}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/crawl/preset")
async def trigger_preset_crawl():
    """预置数据抓取（无AI处理）"""
    try:
        await clear_db()
        from crawler.multi_source import crawl_preset
        articles = await crawl_preset()
        if not articles:
            return {"status": "warning", "message": "预置数据为空", "count": 0}

        count = await insert_articles_batch(articles)

        await add_crawl_history({
            "status": "success",
            "crawled": len(articles),
            "saved": count,
            "new_articles": count,
            "sources": ["preset"],
            "message": "预置数据抓取完成",
        })

        return {"status": "ok", "crawled": len(articles), "saved": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────
# AI API
# ──────────────────────────────────────────

@app.post("/api/chat")
async def chat_endpoint(body: dict):
    question = body.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    result = await query_news(page=1, page_size=25, sort_by="publish_date", sort_order="desc")
    articles = result.get("articles", [])

    if not articles:
        return {"answer": "暂无新闻数据，请先采集新闻。", "question": question}

    answer = await ai_pipeline.chat(question, articles)
    return {"answer": answer, "question": question}


@app.post("/api/report")
async def generate_report():
    """生成并保存周报"""
    from models.database import save_weekly_report
    
    result = await query_news(page=1, page_size=25, sort_by="importance_score", sort_order="desc")
    articles = result.get("articles", [])

    if not articles:
        raise HTTPException(status_code=400, detail="暂无新闻数据")

    report = await ai_pipeline.generate_report(articles)
    week_start = datetime.now() - timedelta(days=7)
    new_count = await count_articles_since(week_start.strftime("%Y-%m-%d"))
    
    generated_at = datetime.now().isoformat()
    
    # 保存周报
    report_id = await save_weekly_report({
        "title": f"软通动力新闻周报 - {datetime.now().strftime('%Y-%m-%d')}",
        "content": report,
        "article_count": len(articles),
        "new_this_week": new_count,
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": datetime.now().strftime("%Y-%m-%d"),
        "generated_at": generated_at
    })

    return {
        "id": report_id,
        "report": report,
        "article_count": len(articles),
        "new_this_week": new_count,
        "generated_at": generated_at,
    }


@app.get("/api/reports")
async def list_reports(limit: int = Query(20, ge=1, le=100)):
    """获取周报历史列表"""
    from models.database import get_weekly_reports
    reports = await get_weekly_reports(limit)
    return {"reports": reports, "total": len(reports)}


@app.get("/api/reports/{report_id}")
async def get_report_detail(report_id: int):
    """获取单份周报详情"""
    from models.database import get_weekly_report
    report = await get_weekly_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="周报不存在")
    return report


@app.get("/api/models")
async def get_models():
    models = [
        {"id": "astron-code-latest", "name": "讯飞星火 (astron-code)", "provider": "xfyun"},
    ]
    return {"models": models, "current": os.getenv("AI_MODEL", "astron-code-latest")}


# ──────────────────────────────────────────
# 多任务调度API
# ──────────────────────────────────────────

@app.get("/api/tasks")
async def list_tasks():
    """获取所有定时任务"""
    tasks = scheduler.list_tasks()
    return {"tasks": tasks}


@app.post("/api/tasks")
async def create_task(body: dict):
    """创建新任务"""
    task = scheduler.add_task(body)
    return {"status": "ok", "task": task}


@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, body: dict):
    """更新任务"""
    task = scheduler.update_task(task_id, body)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"status": "ok", "task": task}


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    ok = scheduler.delete_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"status": "ok", "message": "任务已删除"}


@app.post("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: str):
    """启用/禁用任务"""
    task = scheduler.toggle_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"status": "ok", "task": task}


@app.post("/api/tasks/{task_id}/trigger")
async def trigger_task(task_id: str):
    """手动触发任务"""
    task = scheduler.trigger_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"status": "ok", "message": f"任务 '{task['name']}' 已触发"}


@app.get("/api/scheduler/status")
async def get_scheduler_status():
    """调度器全局状态"""
    return scheduler.get_status()


# ──────────────────────────────────────────
# 抓取历史API
# ──────────────────────────────────────────

@app.get("/api/history")
async def get_history(limit: int = Query(50, ge=1, le=200)):
    """获取抓取历史"""
    history = load_history()
    return {"history": history[-limit:][::-1], "total": len(history)}


# ──────────────────────────────────────────
# 前端静态文件（生产环境）
# ──────────────────────────────────────────

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)

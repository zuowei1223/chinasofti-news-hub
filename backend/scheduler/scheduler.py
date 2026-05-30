"""
软通新闻智能整理器 - 多任务定时抓取调度器
支持多个独立任务，每个任务可配置：名称、调度方式、关键词、分类、抓取源
"""
import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional, Callable, Awaitable
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

# ──────────────────────────────────────────
# 任务模型
# ──────────────────────────────────────────

TASKS_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "tasks.json")
HISTORY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "crawl_history.json")

ALL_SOURCES = ["rss", "preset"]  # baidu/sogou 已禁用（反爬严重）
ALL_CATEGORIES = ["公司动态", "产品技术", "合作生态", "市场拓展", "荣誉奖项", "财务投资", "人才文化", "其他"]


def make_task(
    name: str = "新任务",
    interval_minutes: int = 60,
    cron_expression: str = "",
    keywords: list = None,
    categories: list = None,
    sources: list = None,
    enabled: bool = True,
) -> dict:
    """创建一个任务配置"""
    return {
        "id": uuid.uuid4().hex[:12],
        "name": name,
        "enabled": enabled,
        "interval_minutes": interval_minutes,
        "cron_expression": cron_expression,
        "keywords": keywords or ["软通动力", "软通"],
        "categories": categories or ["产品技术", "合作生态", "市场拓展"],
        "sources": sources or ALL_SOURCES[:],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "last_run": None,
        "last_result": None,
    }


# ──────────────────────────────────────────
# 任务持久化
# ──────────────────────────────────────────

def load_tasks() -> list:
    """加载所有任务"""
    if os.path.exists(TASKS_CONFIG_PATH):
        try:
            with open(TASKS_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Scheduler] 任务加载失败: {e}")
    # 默认创建一个任务
    default = make_task(name="默认抓取任务", interval_minutes=60)
    save_tasks([default])
    return [default]


def save_tasks(tasks: list):
    """保存所有任务"""
    os.makedirs(os.path.dirname(TASKS_CONFIG_PATH), exist_ok=True)
    with open(TASKS_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


def load_history() -> list:
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_history(history: list):
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history[-200:], f, ensure_ascii=False, indent=2)


def add_history_record(record: dict):
    history = load_history()
    record["id"] = len(history) + 1
    record["timestamp"] = datetime.now().isoformat()
    history.append(record)
    save_history(history)


# ──────────────────────────────────────────
# 多任务调度器
# ──────────────────────────────────────────

class NewsScheduler:
    """多任务定时新闻抓取调度器"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
        self._running = False
        self._crawl_func: Optional[Callable[..., Awaitable]] = None

    def start(self, crawl_func):
        """启动调度器"""
        self._crawl_func = crawl_func
        tasks = load_tasks()
        for task in tasks:
            if task.get("enabled", True):
                self._add_job(task)
        self.scheduler.start()
        self._running = True
        enabled_count = sum(1 for t in tasks if t.get("enabled"))
        print(f"[Scheduler] 调度器已启动, {enabled_count}/{len(tasks)} 个任务已激活")

    def stop(self):
        self.scheduler.shutdown(wait=False)
        self._running = False
        print("[Scheduler] 调度器已停止")

    def _job_id(self, task_id: str) -> str:
        return f"task_{task_id}"

    def _add_job(self, task: dict):
        """为一个任务添加调度job"""
        job_id = self._job_id(task["id"])
        # 移除旧的
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        if not task.get("enabled", True):
            return

        cron_expr = task.get("cron_expression", "").strip()
        interval = task.get("interval_minutes", 60)

        if cron_expr:
            try:
                parts = cron_expr.split()
                if len(parts) == 5:
                    trigger = CronTrigger(
                        minute=parts[0], hour=parts[1],
                        day=parts[2], month=parts[3],
                        day_of_week=parts[4],
                        timezone="Asia/Shanghai"
                    )
                    self.scheduler.add_job(
                        self._make_crawl_wrapper(task),
                        trigger=trigger,
                        id=job_id, replace_existing=True
                    )
                    print(f"[Scheduler] 任务 '{task['name']}' cron={cron_expr}")
                    return
            except Exception as e:
                print(f"[Scheduler] cron无效: {e}, 回退interval")

        trigger = IntervalTrigger(minutes=max(interval, 10))
        self.scheduler.add_job(
            self._make_crawl_wrapper(task),
            trigger=trigger,
            id=job_id, replace_existing=True
        )
        print(f"[Scheduler] 任务 '{task['name']}' 每{interval}分钟")

    def _make_crawl_wrapper(self, task: dict):
        """为每个任务创建独立的抓取回调"""
        async def wrapper():
            print(f"[Scheduler] ⏰ 任务 '{task['name']}' 开始抓取 - {datetime.now().isoformat()}")
            try:
                result = await self._crawl_func(
                    keywords=task.get("keywords", []),
                    categories=task.get("categories", []),
                    sources=task.get("sources", []),
                )
                # 更新任务的 last_run/last_result
                tasks = load_tasks()
                for t in tasks:
                    if t["id"] == task["id"]:
                        t["last_run"] = datetime.now().isoformat()
                        t["last_result"] = {
                            "status": "success",
                            "crawled": result.get("crawled", 0),
                            "saved": result.get("saved", 0),
                            "new_articles": result.get("new_articles", 0),
                            "sources": result.get("sources", []),
                            "message": result.get("message", "抓取完成"),
                        }
                        break
                save_tasks(tasks)

                add_history_record({
                    "task_id": task["id"],
                    "task_name": task["name"],
                    "status": "success",
                    "crawled": result.get("crawled", 0),
                    "saved": result.get("saved", 0),
                    "new_articles": result.get("new_articles", 0),
                    "sources": result.get("sources", []),
                    "message": result.get("message", "抓取完成"),
                })
                print(f"[Scheduler] ✅ 任务 '{task['name']}' 完成: {result}")
            except Exception as e:
                tasks = load_tasks()
                for t in tasks:
                    if t["id"] == task["id"]:
                        t["last_run"] = datetime.now().isoformat()
                        t["last_result"] = {"status": "error", "message": str(e)}
                        break
                save_tasks(tasks)

                add_history_record({
                    "task_id": task["id"],
                    "task_name": task["name"],
                    "status": "error",
                    "crawled": 0, "saved": 0, "new_articles": 0,
                    "message": str(e),
                })
                print(f"[Scheduler] ❌ 任务 '{task['name']}' 失败: {e}")

        return wrapper

    # ── 任务CRUD ──

    def list_tasks(self) -> list:
        """列出所有任务（含下次运行时间）"""
        tasks = load_tasks()
        for task in tasks:
            job = self.scheduler.get_job(self._job_id(task["id"]))
            task["next_run_time"] = job.next_run_time.isoformat() if job and job.next_run_time else None
        return tasks

    def add_task(self, task_data: dict) -> dict:
        """创建新任务"""
        task = make_task(
            name=task_data.get("name", "新任务"),
            interval_minutes=task_data.get("interval_minutes", 60),
            cron_expression=task_data.get("cron_expression", ""),
            keywords=task_data.get("keywords"),
            categories=task_data.get("categories"),
            sources=task_data.get("sources"),
            enabled=task_data.get("enabled", True),
        )
        tasks = load_tasks()
        tasks.append(task)
        save_tasks(tasks)
        if task["enabled"]:
            self._add_job(task)
        print(f"[Scheduler] 新任务已创建: {task['name']} ({task['id']})")
        return task

    def update_task(self, task_id: str, updates: dict) -> Optional[dict]:
        """更新任务"""
        tasks = load_tasks()
        for task in tasks:
            if task["id"] == task_id:
                for key in ["name", "interval_minutes", "cron_expression", "keywords", "categories", "sources", "enabled"]:
                    if key in updates:
                        task[key] = updates[key]
                task["updated_at"] = datetime.now().isoformat()
                save_tasks(tasks)
                # 重新调度
                self._add_job(task)
                print(f"[Scheduler] 任务已更新: {task['name']}")
                return task
        return None

    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        tasks = load_tasks()
        new_tasks = [t for t in tasks if t["id"] != task_id]
        if len(new_tasks) == len(tasks):
            return False
        save_tasks(new_tasks)
        # 移除job
        job_id = self._job_id(task_id)
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
        print(f"[Scheduler] 任务已删除: {task_id}")
        return True

    def toggle_task(self, task_id: str) -> Optional[dict]:
        """切换任务启用/禁用"""
        tasks = load_tasks()
        for task in tasks:
            if task["id"] == task_id:
                task["enabled"] = not task.get("enabled", True)
                task["updated_at"] = datetime.now().isoformat()
                save_tasks(tasks)
                self._add_job(task)
                return task
        return None

    def trigger_task(self, task_id: str):
        """手动触发任务"""
        tasks = load_tasks()
        for task in tasks:
            if task["id"] == task_id:
                wrapper = self._make_crawl_wrapper(task)
                asyncio.ensure_future(wrapper())
                return task
        return None

    def get_status(self) -> dict:
        """调度器全局状态"""
        tasks = load_tasks()
        return {
            "running": self._running,
            "total_tasks": len(tasks),
            "enabled_tasks": sum(1 for t in tasks if t.get("enabled")),
        }


# 全局实例
scheduler = NewsScheduler()

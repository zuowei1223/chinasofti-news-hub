# 软通新闻智能整理器

AI驱动的软通动力新闻智能采集、分析与可视化平台。

## 功能特性

- **智能采集**：多源爬取软通动力官网、百度新闻、搜狗新闻、36氪等平台的新闻
- **AI分析**：自动生成摘要、分类、关键词提取、情感分析、重要性评分
- **新闻列表**：支持搜索、分类筛选、情感筛选、分页浏览
- **数据仪表盘**：分类分布图、情感分析图、每日趋势、关键词词云
- **时间轴视图**：按日期展示新闻事件脉络
- **一键采集**：Web界面一键触发采集+AI分析

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI + SQLite + httpx + BeautifulSoup |
| 前端 | Next.js 14 + TypeScript + TailwindCSS |
| AI | 科大讯飞MaaS / DeepSeek / OpenAI 兼容 API |
| 部署 | Docker + Docker Compose |

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入API Key
```

### 2. 开发模式

```bash
./start-dev.sh
```

访问 http://localhost:3000

### 3. Docker部署

```bash
docker-compose up --build -d
```

访问 http://localhost:3000

## API文档

启动后端后访问 http://localhost:8000/docs 查看完整API文档。

### 主要接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/news` | GET | 新闻列表（搜索、筛选、分页） |
| `/api/news/{id}` | GET | 新闻详情 |
| `/api/dashboard` | GET | 仪表盘统计数据 |
| `/api/categories` | GET | 分类列表 |
| `/api/crawl` | POST | 触发爬虫采集 |
| `/api/health` | GET | 健康检查 |

## 使用流程

1. 启动服务
2. 点击「采集最新新闻」按钮
3. 等待采集和AI处理完成
4. 浏览新闻列表、查看仪表盘、浏览时间轴

## 项目结构

```
chinasofti-news-hub/
├── backend/
│   ├── main.py              # FastAPI入口
│   ├── requirements.txt     # Python依赖
│   ├── Dockerfile
│   ├── crawler/
│   │   └── news_crawler.py  # 多源新闻爬虫
│   ├── ai/
│   │   └── pipeline.py      # AI处理管线
│   └── models/
│       ├── schemas.py       # 数据模型
│       └── database.py      # 数据库操作
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # 新闻列表页
│   │   │   ├── NewsPage.tsx     # 新闻列表组件
│   │   │   ├── dashboard/       # 仪表盘
│   │   │   └── timeline/        # 时间轴
│   │   ├── components/
│   │   │   └── Navbar.tsx       # 导航栏
│   │   └── lib/
│   │       └── api.ts           # API客户端
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── start-dev.sh
└── README.md
```

## AI能力

本应用的AI管线在以下环节增值（vs 直接问大模型）：

1. **多源实时采集**：不是靠模型记忆，而是实时爬取多个新闻源
2. **结构化输出**：固定模板保证信息完整性，不会遗漏字段
3. **批量分析**：一次性对20+篇新闻进行摘要、分类、关键词、情感分析
4. **趋势发现**：自动聚合统计，发现新闻趋势和热点话题

## License

MIT

# 软通新闻智能整理器 - 问题分析与优化方案

## 一、问题分析

### 1. 分类分布显示数字而非柱状图

**现象**：Dashboard 分类分布区域只显示数字，没有柱状图渲染

**根因分析**：
- 后端 API 返回数据正常：`{"财务投资": 7, "产品技术": 6, ...}`
- 前端 `dashboard/page.tsx` 代码逻辑正确（172-199行）
- **可能原因**：CSS 样式问题导致柱子高度为 0 或不可见

**代码定位**：
```tsx
// dashboard/page.tsx:185-192
<div 
  className={`w-full rounded-t-lg bg-gradient-to-t ${categoryColors[cat]}`}
  style={{ height: `${height}%` }}  // height 可能计算为 0
>
```

**修复方案**：
- 检查 `flex-1` 容器是否正确继承高度
- 添加调试日志确认 height 值
- 确保父容器 `flex items-end gap-3 h-40` 正确设置高度

---

### 2. AI周报没有历史周报记录

**现象**：生成周报后刷新页面就消失了，无法查看历史

**根因分析**：
- 当前 `/report` 页面是**临时状态**（useState），刷新即丢失
- 后端 `/api/report` 每次重新生成，**不保存历史**
- **缺失**：周报持久化存储机制

**修复方案**：

#### 方案A：后端持久化（推荐）
1. 创建 `weekly_reports` 数据库表
   ```sql
   CREATE TABLE weekly_reports (
     id INTEGER PRIMARY KEY,
     title TEXT,
     content TEXT,
     article_count INTEGER,
     generated_at DATETIME,
     week_start DATE,
     week_end DATE
   );
   ```

2. 新增 API 端点
   - `POST /api/reports` - 生成并保存周报
   - `GET /api/reports` - 获取历史周报列表
   - `GET /api/reports/{id}` - 获取单份周报详情

3. 前端改造
   - 显示历史周报列表（按时间倒序）
   - "生成新周报"按钮
   - 点击历史周报可查看详情

#### 方案B：前端 LocalStorage（临时方案）
- 生成后存入 localStorage
- 仅限当前浏览器可用
- 不适合多用户/跨设备场景

**推荐**：采用方案A（后端持久化），数据更可靠

---

### 3. 新闻抓取+AI分析没有操作入口

**现象**：用户无法主动触发新闻抓取，数据只能通过定时任务进入

**当前状态**：
- 后端有 `/api/crawl` 和 `/api/crawl/preset` 接口（main.py:174-211）
- **前端没有调用入口**
- 用户只能去"定时任务"页面触发任务

**修复方案**：

#### 新增"数据管理"页面 `/admin`

功能模块：
1. **手动抓取**
   - 触发全量抓取（清空后重新抓取）
   - 触发增量抓取（追加模式）
   - 加载预置数据（演示用）

2. **数据统计**
   - 总新闻数、今日新增
   - 最近抓取记录

3. **数据操作**
   - 清空数据库（危险操作，需确认）
   - 导出数据

#### 页面布局：
```
┌─────────────────────────────────────┐
│ 数据管理                             │
├─────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐         │
│ │ 手动抓取   │ │ 加载预置   │         │
│ │           │ │           │         │
│ │ [全量]    │ │ [加载预置] │         │
│ │ [增量]    │ │           │         │
│ └───────────┘ └───────────┘         │
│                                     │
│ 最近抓取记录：                        │
│ - 2026-05-28 14:30 抓取 7 条         │
│ - 2026-05-27 09:00 抓取 3 条         │
└─────────────────────────────────────┘
```

---

## 二、实施优先级

| 优先级 | 问题 | 工作量 | 影响范围 |
|--------|------|--------|----------|
| P0 | 分类分布柱状图不显示 | 小 | 仅 Dashboard |
| P1 | 新闻抓取入口缺失 | 中 | 新增页面 |
| P2 | 周报历史记录 | 中 | 后端+前端 |

---

## 三、详细实施方案

### P0：修复分类分布柱状图（预计30分钟）

**步骤**：
1. 检查 API 数据格式是否正确
2. 检查前端 height 计算逻辑
3. 修复 CSS flex 布局
4. 添加空数据提示

### P1：新增数据管理页面（预计2小时）

**文件清单**：
- `frontend/src/app/admin/page.tsx` - 数据管理页面
- `backend/models/database.py` - 新增抓取历史查询函数
- `frontend/src/components/Navbar.tsx` - 添加导航项

**API 端点**：
- 已有：`POST /api/crawl`, `POST /api/crawl/preset`
- 已有：`GET /api/history` - 获取抓取历史

### P2：周报历史记录（预计1.5小时）

**文件清单**：
- `backend/models/database.py` - 新增周报表和函数
- `backend/main.py` - 新增周报 API
- `frontend/src/app/report/page.tsx` - 改造为列表+详情模式

**数据库设计**：
```sql
CREATE TABLE weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  article_count INTEGER DEFAULT 0,
  new_this_week INTEGER DEFAULT 0,
  week_start TEXT,
  week_end TEXT,
  generated_at TEXT NOT NULL
);
```

---

## 四、技术要点

### 柱状图渲染问题调试

```tsx
// 添加调试日志
console.log('Categories:', stats.categories);
console.log('MaxCat:', maxCat);

Object.entries(stats.categories || {}).forEach(([cat, count]) => {
  const height = maxCat > 0 ? (count / maxCat) * 100 : 0;
  console.log(`${cat}: ${count} -> height=${height}%`);
});
```

### 数据管理页面关键代码

```tsx
// 触发增量抓取
const handleIncrementalCrawl = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'incremental' })
    });
    const data = await res.json();
    toast.success(`抓取完成，新增 ${data.new_articles} 条新闻`);
  } catch (e) {
    toast.error('抓取失败');
  } finally {
    setLoading(false);
  }
};
```

---

## 五、风险与注意事项

1. **柱状图修复**：注意 CSS 兼容性，确保在所有浏览器正常显示
2. **数据管理**：清空数据库操作需二次确认，防止误操作
3. **周报历史**：需要考虑分页，历史记录可能很多
4. **权限控制**：数据管理功能敏感，生产环境应限制访问

---

## 六、验收标准

### P0 完成：
- [ ] Dashboard 分类分布显示为柱状图
- [ ] 柱子高度正确反映数据比例
- [ ] 鼠标悬停有交互反馈

### P1 完成：
- [ ] 有独立的"数据管理"入口
- [ ] 可手动触发全量/增量抓取
- [ ] 显示最近抓取记录
- [ ] 抓取完成后有反馈提示

### P2 完成：
- [ ] 周报生成后自动保存
- [ ] 可查看历史周报列表
- [ ] 点击历史周报可查看详情
- [ ] 历史周报按时间倒序排列

---

**方案制定时间**：2026-05-28
**预计总工时**：4小时

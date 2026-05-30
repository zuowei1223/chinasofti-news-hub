#!/bin/bash
# 软通新闻智能整理器 - 快速启动脚本（开发模式）

set -e
cd "$(dirname "$0")"

echo "🚀 软通新闻智能整理器 - 开发模式启动"
echo "======================================"

# 检查 .env
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从模板复制..."
    cp .env.example .env
    echo "请编辑 .env 文件填入API Key后重新运行"
    exit 1
fi

# 加载环境变量
source .env

# 后端
echo ""
echo "📦 安装后端依赖..."
cd backend
pip install -q -r requirements.txt

echo ""
echo "🔧 启动后端服务 (端口 8000)..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 前端
echo ""
echo "📦 安装前端依赖..."
cd frontend
npm install --silent 2>/dev/null

echo ""
echo "🎨 启动前端服务 (端口 3000)..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "======================================"
echo "✅ 服务启动成功！"
echo ""
echo "  前端：http://localhost:3000"
echo "  后端API：http://localhost:8000"
echo "  API文档：http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "======================================"

# 等待
wait

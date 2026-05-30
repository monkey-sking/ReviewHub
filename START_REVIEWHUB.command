#!/bin/bash
cd "$(dirname "$0")"
echo "------------------------------------------------"
echo "🚀 ReviewHub 平台化生产版 - 启动中..."
echo "------------------------------------------------"

# 默认生产路径
PROD_OPS_ROOT="/Volumes/SSD/Projects/Operations"

# 清理旧端口
PORT=4310
PID=$(lsof -ti:$PORT)
if [ ! -z "$PID" ]; then
  kill -9 $PID
fi

# 确保生产目录可访问
if [ ! -d "$PROD_OPS_ROOT" ]; then
  echo "❌ 错误: 未发现生产数据目录 $PROD_OPS_ROOT"
  echo "请确保 Operations 仓库已挂载。"
  exit 1
fi

# 设置环境变量并启动
export OPERATIONS_ROOT="$PROD_OPS_ROOT"
export NODE_ENV=production

echo "✅ 成功连接到生产数据源：$PROD_OPS_ROOT"
echo "✅ 服务已启动！"
echo "👉 请在浏览器访问: http://localhost:4310"
echo "👉 按 Ctrl+C 可以停止服务"
echo "------------------------------------------------"

node server.js

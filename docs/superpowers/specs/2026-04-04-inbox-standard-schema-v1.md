# ReviewHub Inbox 自动化结果统一数据模型 (v1)

由 Lobster (大虾) 提供，作为 ReviewHub 执行收件箱标准化接入的基础。

## 1. 核心模型结构

```json
{
  "id": "inbox_20260404_001",
  "kind": "execution_failed", 
  "status": "pending",
  "title": "Aion Paddle 指标抓取失败",
  "summary": "Paddle 交易流水抓取超时，导致 2026-04-04 财务指标未刷新。",
  "project_id": "aion",
  "source_task": {
    "task_type": "crawl",
    "task_id": "task_paddle_sync",
    "run_id": "run_20260404_1012"
  },
  "evidence": {
    "input_summary": "product=aion, endpoint=/transactions, date=2026-04-04",
    "error_excerpt": "HTTPSConnectionPool(host='api.paddle.com', port=443): Read timed out.",
    "decision_context": null,
    "log_ref": "/Volumes/SSD/Projects/Operations/Ops/runs/2026-04-04/logs/paddle_sync.log",
    "artifact_refs": []
  },
  "retry": {
    "retryable": true,
    "retry_handler": "scripts/retry_paddle_sync.sh",
    "retry_mode": "single_only",
    "retry_count": 0,
    "last_retry_at": null
  },
  "action_hints": ["retry", "request_support", "ignore", "open_exception"],
  "created_at": "2026-04-04T17:20:00Z",
  "updated_at": "2026-04-04T17:20:00Z"
}
```

## 2. 字段详细定义

### 2.1 Kind (类型)
- `approval_request`: 待人工审批/决策。
- `execution_failed`: 执行失败，需补救。
- `support_required`: 系统无法继续，需人工介入（如补凭据）。
- `recovery_needed`: 链条断裂，需人工修复环境或数据。
- `actionable_signal`: 高价值业务信号，需人工跟进。

### 2.2 Status (状态)
- `pending`: 待处理。
- `processing`: 正在处理/重试中。
- `resolved`: 已解决/已完成。
- `ignored`: 已忽略/已关闭。

### 2.3 Evidence (证据层)
- `input_summary`: 任务输入参数的简要描述。
- `error_excerpt`: 关键错误日志片段（直接展示在 UI 上）。
- `log_ref`: 原始日志的本地路径或 URL。

### 2.4 Retry (重试机制)
- `retryable`: 是否允许在 UI 点击重试。
- `retry_handler`: 后端执行重试的具体脚本路径或别名。

## 3. 入箱原则 (Routing Rules)
- **YES**: 需要后续动作、需要补救、需要决策、失败且未自动恢复。
- **NO**: 纯记录日志、常规成功、无需人工复核、已在其他系统闭环。

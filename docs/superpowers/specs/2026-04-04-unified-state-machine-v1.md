# ReviewHub 统一状态机规范 (v1)

由 Lobster (大虾) 提供，作为 ReviewHub 跨页面状态一致性的唯一真理。

## 1. 主状态枚举 (States)

| 状态 (State) | 说明 |
| :--- | :--- |
| `new` | 新进入系统，尚未分流。 |
| `ready` | 已具备处理条件，等待执行（如审批已过）。 |
| `running` | 正在执行中。 |
| `blocked` | 系统性卡顿（依赖上游等）。 |
| `pending_approval` | **高亮**：明确卡在人工审批。 |
| `waiting_support` | **高亮**：卡在人工支持（如缺凭据、登录）。 |
| `resolved` | 问题已解决，待最终验证或归档。 |
| `done` | 链路完全闭环，无需后续动作。 |
| `ignored` | 明确决定不处理，关闭当前动作。 |

## 2. 核心流转规则

### 2.1 基础路径
- `new` -> `ready` -> `running` -> `done`
- `new` -> `pending_approval` -> `ready` ...
- `new` -> `waiting_support` -> `ready` ...

### 2.2 异常补救路径
- `running` -> `blocked` -> `ready`
- `running` -> `resolved` -> `done`

### 2.3 终止路径
- `any active state` -> `ignored`

## 3. 跨页面映射与同步逻辑 (Crucial)

### 3.1 Inbox (动作视角)
- **展示**: `new`, `ready`, `blocked`, `pending_approval`, `waiting_support`。
- **隐藏**: `resolved`, `done`, `ignored`。

### 3.2 Workboard (推进视角)
- **泳道分流**:
    - **决策中**: `pending_approval`, `new`
    - **可推进**: `ready`, `running`
    - **阻塞中**: `blocked`, `waiting_support`
    - **观察中**: `resolved`, `done`, `ignored`

### 3.3 级联规则 (Anti-Pollution)
- **子项状态变更** (如 Inbox 标记 `resolved`) **不自动触发** 父项标记 `done`。
- 必须触发 **父项状态重新评估**：仅当所有阻塞子项均达到 `resolved/done/ignored` 时，父项方可从 `blocked` 恢复至 `ready`。

## 4. 后端实现建议
- 所有 API 必须返回 `state` 字段。
- 所有的动作接口（Action API）必须根据此流转表进行合法性校验。

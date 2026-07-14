# Harmovela Protocol 设计草案

## 协议名称

工作名称：**Harmovela Protocol**。

扩展范围：异步事件、异步工具生命周期、上下文事件、记忆事件和智能体协调消息。

## 核心消息信封

每个 Harmovela 事件使用一个通用信封。

```json
{
  "spec_version": "0.1",
  "id": "evt_01JZ0000000000000000000000",
  "type": "tool.call.progress",
  "source": "tool:web_crawler",
  "target": "agent:researcher",
  "topic": "tasks.task_01",
  "session_id": "sess_01",
  "conversation_id": "conv_01",
  "task_id": "task_01",
  "correlation_id": "corr_01",
  "causation_id": "evt_01JYZZZZZZZZZZZZZZZZZZZZZZ",
  "created_at": "2026-07-09T10:00:00Z",
  "expires_at": null,
  "delivery": {
    "mode": "at_least_once",
    "sequence": 42,
    "cursor": "stream_01:42"
  },
  "payload_schema": "https://schemas.axisrobo.com/tool.call.progress.v1.json",
  "payload": {
    "message": "Indexed 120 of 500 pages",
    "progress": 0.24
  }
}
```

## 必填信封字段

- `spec_version`：协议版本
- `id`：全局唯一事件 ID
- `type`：使用点号命名的事件类型
- `source`：事件生产者标识
- `created_at`：事件创建时间戳
- `payload`：事件特定内容

## 推荐信封字段

- `target`：预期的消费者或受众
- `topic`：路由主题
- `session_id`：运行时会话
- `conversation_id`：对话或交互线程
- `task_id`：相关的长时间运行任务
- `correlation_id`：逻辑操作关联键
- `causation_id`：导致此事件的事件
- `expires_at`：事件相关性截止时间
- `delivery`：交付元数据
- `payload_schema`：用于校验的模式 URI

## 事件类型命名

事件类型使用点号命名空间：

```text
domain.object.action（领域.对象.动作）
```

示例：

- `event.acknowledged`
- `subscription.created`
- `tool.call.requested`
- `tool.call.progress`
- `tool.call.completed`
- `memory.fact.invalidated`
- `context.snapshot.ready`
- `agent.message.sent`
- `environment.observed`

## 标准事件族

### 会话事件

- `session.opened` -- 会话已打开
- `session.ready` -- 会话就绪
- `session.heartbeat` -- 心跳
- `session.closed` -- 会话已关闭
- `session.error` -- 会话错误

### 能力事件

- `capabilities.requested` -- 请求能力
- `capabilities.declared` -- 声明能力
- `capabilities.changed` -- 能力变更

### 订阅事件

- `subscription.requested` -- 请求订阅
- `subscription.created` -- 订阅已创建
- `subscription.rejected` -- 订阅被拒绝
- `subscription.cancelled` -- 订阅已取消
- `subscription.expired` -- 订阅已过期

### 交付事件

- `event.acknowledged` -- 事件已确认
- `event.rejected` -- 事件被拒绝
- `event.redelivered` -- 事件重新交付
- `event.replayed` -- 事件已重放
- `event.dead_lettered` -- 事件进入死信

### 异步工具事件

- `tool.call.requested` -- 请求工具调用
- `tool.call.accepted` -- 工具调用已接受
- `tool.call.rejected` -- 工具调用被拒绝
- `tool.call.started` -- 工具调用已开始
- `tool.call.progress` -- 工具调用进度
- `tool.call.output` -- 工具调用输出
- `tool.call.completed` -- 工具调用已完成
- `tool.call.failed` -- 工具调用失败
- `tool.call.cancel.requested` -- 请求取消工具调用
- `tool.call.cancelled` -- 工具调用已取消
- `tool.call.timed_out` -- 工具调用超时

### 任务事件

- `task.submitted` -- 任务已提交
- `task.accepted` -- 任务已接受
- `task.started` -- 任务已开始
- `task.blocked` -- 任务被阻塞
- `task.progress` -- 任务进度
- `task.output` -- 任务输出
- `task.completed` -- 任务已完成
- `task.failed` -- 任务失败
- `task.cancel.requested` -- 请求取消任务
- `task.cancelled` -- 任务已取消
- `task.timed_out` -- 任务超时

### 上下文事件

- `context.updated` -- 上下文已更新
- `context.invalidated` -- 上下文已失效
- `context.snapshot.requested` -- 请求上下文快照
- `context.snapshot.ready` -- 上下文快照就绪
- `context.retrieval.started` -- 上下文检索开始
- `context.retrieval.completed` -- 上下文检索完成
- `context.retrieval.failed` -- 上下文检索失败

### 记忆事件

- `memory.fact.added` -- 事实已添加
- `memory.fact.updated` -- 事实已更新
- `memory.fact.invalidated` -- 事实已失效
- `memory.episode.stored` -- 情节已存储
- `memory.preference.updated` -- 偏好已更新
- `memory.constraint.updated` -- 约束已更新
- `memory.summary.ready` -- 摘要就绪
- `memory.retrieval.ready` -- 检索就绪

### 智能体消息事件

- `agent.message.sent` -- 消息已发送
- `agent.message.received` -- 消息已接收
- `agent.message.failed` -- 消息发送失败
- `agent.request.created` -- 请求已创建
- `agent.response.created` -- 响应已创建
- `agent.decision.recorded` -- 决策已记录

### 环境事件

- `environment.observed` -- 环境观察
- `environment.changed` -- 环境变化
- `environment.alerted` -- 环境告警
- `environment.error` -- 环境错误

### 信念事件

- `belief.revised` -- 信念已修正
- `belief.conflict.detected` -- 检测到信念冲突

### 新鲜度事件

- `freshness.expired` -- 新鲜度已过期
- `freshness.window.changed` -- 新鲜度窗口已变化

### 委派事件

- `delegation.requested` -- 请求委派
- `delegation.accepted` -- 委派已接受
- `delegation.rejected` -- 委派被拒绝
- `delegation.handoff.completed` -- 移交完成
- `delegation.escalated` -- 已升级

### 中断事件

- `interruption.requested` -- 请求中断
- `interruption.acknowledged` -- 中断已确认
- `interruption.saved` -- 已保存
- `interruption.resumed` -- 已恢复
- `interruption.cancelled` -- 中断已取消

### 补偿事件

- `compensation.requested` -- 请求补偿
- `compensation.completed` -- 补偿完成

### 溯源事件

- `provenance.attestation.added` -- 证明已添加
- `provenance.attestation.revoked` -- 证明已撤销
- `provenance.chain.truncated` -- 链已截断

## 异步工具生命周期

异步工具调用是一个任务式的流。

正常路径：
```text
tool.call.requested -> accepted -> started -> progress -> output -> completed
```

失败路径：
```text
tool.call.requested -> accepted -> started -> failed
```

取消路径：
```text
tool.call.cancel.requested -> tool.call.cancelled
```

## 订阅模型

订阅描述了消费者希望接收什么。

```json
{
  "types": ["memory.*", "tool.call.*"],
  "source": ["memory:main", "tool:web_crawler"],
  "target": "agent:researcher",
  "conversation_id": "conv_01",
  "from_cursor": "stream_01:12",
  "delivery_mode": "at_least_once"
}
```

订阅可以按以下条件过滤：

- 事件类型模式
- 来源
- 目标
- 主题
- 会话
- 对话
- 任务
- 时间范围
- 游标

## 交付语义

协议应定义交付模式，但将实现留给传输层。

有效模式：

- `best_effort` -- 尽力而为（可能丢失）
- `at_least_once` -- 至少一次（持久，可能重复）
- `replayable` -- 可重放（持久，支持游标重放）

Harmovela 应避免承诺严格的恰好一次交付。相反，每个事件都有一个稳定的 ID 以便消费者可以去重。

## 错误模型

错误应为事件，而不仅仅是传输失败。

标准错误负载：

```json
{
  "code": "tool_timeout",
  "message": "爬虫超过了配置的超时时间",
  "retryable": true,
  "details": {}
}
```

## 版本控制

Harmovela 应版本化：

- 协议信封
- 事件类型族
- 负载模式
- 传输绑定

信封应在小版本之间保持稳定。

## 最小 V0.1 表面

第一个可用版本应包含：

- 事件信封
- 会话初始化
- 能力声明
- 订阅创建/取消
- 事件发布
- 事件确认
- 异步工具生命周期事件
- 上下文和记忆事件族
- WebSocket 和 stdio 传输绑定

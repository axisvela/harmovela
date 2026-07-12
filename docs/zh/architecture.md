# AEP 架构

## 架构定位

AEP 位于 MCP 旁边，作为智能体系统的异步通信协议。

```text
LLM Agent / Agent Runtime (智能体运行时)
        |
        | 同步调用
        v
       MCP
        |
        | 工具、资源、提示

LLM Agent / Agent Runtime (智能体运行时)
        ^
        | 异步事件
        v
       AEP
        |
        | 工具、记忆、上下文、环境、智能体、编排器
```

MCP 回答："我能调用什么？当前的结果是什么？"

AEP 回答："发生了什么？什么还在进行中？我应该对什么做出反应？"

## AEP 增加了什么

通用事件基础设施已经提供了信封、代理、交付机制和传输绑定。AEP 并不替换这些关注点。它添加了一个共享的、面向智能体的词汇表，用于任务生命周期、上下文和记忆变化、环境观察和智能体协调。

AEP 还推荐使用一致命名的关联字段，如 `session_id`、`conversation_id`、`task_id`、`correlation_id` 和 `causation_id`。这些字段是可选的、可组合的，不是强制性的或层级化的。上下文或记忆失效后的信念修正的详细消费者语义仍在未来的规范工作中。

## 主要组件

### 智能体 (Agent)

智能体是事件的生产者和消费者。它可以发布消息、订阅主题、启动异步任务、接收进度、对上下文变化做出反应，并与其他智能体协调。

### 工具 (Tool)

工具可以暴露同步的 MCP 调用、异步的 AEP 任务，或两者兼有。一个慢速工具可以快速接受工作并通过 AEP 发出任务生命周期事件。

### 记忆系统 (Memory System)

当事实、章节、偏好、约束、摘要或检索结果发生变化时，记忆系统会发出事件。它也可以消费智能体事件来构建长期记忆。

### 上下文提供者 (Context Provider)

上下文提供者发出更新、失效、快照和就绪事件。这使得智能体可以避免过时的上下文而无需不断轮询。

### 环境观察器 (Environment Observer)

观察器监视外部状态，如浏览器、文件、机器人、API、传感器、日志或用户活动，并将事件发送到 AEP。

### 编排器 (Orchestrator)

编排器协调订阅、路由事件、跟踪任务生命周期、应用交付策略并桥接传输。

## 协议层

### 1. 传输绑定

AEP 应支持多种传输：

- `stdio` 用于本地进程集成
- `WebSocket` 用于双向本地或远程流
- `HTTP SSE` 用于服务器到客户端的事件流
- `gRPC stream` 用于强类型服务集成
- `NATS`、`Kafka` 或 `Redis Streams` 用于持久化的生产部署

协议不应要求单一的传输方式。每种绑定必须声明其交付行为。

### 2. 会话层

会话层处理初始化、能力协商、心跳、认证元数据和优雅关闭。

示例职责：

- 协议版本协商
- 支持的事件类型
- 支持的传输方式
- 交付保证
- 重放支持
- 最大负载大小
- 压缩支持

### 3. 事件信封层

所有消息使用一个通用信封，包含稳定的字段，用于标识、来源、目标、因果关系、关联、时间戳和负载。

信封是最重要的互操作性界面。

### 4. 订阅层

消费者通过主题、类型模式、来源、目标、对话、任务或领域来订阅事件流。

示例：

- 订阅 `task_123` 的所有事件
- 订阅一个会话的 `memory.*`
- 订阅来自爬虫工具的 `tool.call.*`
- 订阅目标为 `agent:planner` 的 `agent.message.*`

### 5. 任务生命周期层

长时间运行的工作被表示为一个任务流。任务不是单一响应。它是一个具有清晰生命周期语义的事件序列。

标准任务状态：

- `submitted` -- 已提交
- `accepted` -- 已接受
- `running` -- 运行中
- `blocked` -- 被阻塞
- `progress` -- 进度
- `output` -- 输出
- `completed` -- 已完成
- `failed` -- 失败
- `cancelled` -- 已取消
- `timed_out` -- 超时

### 6. 领域事件层

领域事件描述了特定的系统，如记忆、上下文、工具、环境观察器和智能体消息。

核心协议应定义常见的领域系列，但允许扩展。

## 数据流示例

### 异步工具调用

```text
Agent -> AEP: tool.call.requested
AEP -> Tool: tool.call.requested
Tool -> AEP: tool.call.accepted
Tool -> AEP: tool.call.progress
Tool -> AEP: tool.call.output
Tool -> AEP: tool.call.completed
AEP -> Agent: 任务结果事件
```

### 记忆更新

```text
Agent -> Tool: 同步 MCP 调用
Tool -> Memory: 存储新事实
Memory -> AEP: memory.fact.added
AEP -> 已订阅的智能体: memory.fact.added
Agent -> AEP: event.acknowledged
```

### 上下文失效

```text
Context provider -> AEP: context.invalidated
AEP -> Agent: context.invalidated
Agent -> MCP 或 AEP: 请求新上下文
Context provider -> AEP: context.snapshot.ready
```

## 可靠性模型

AEP 应支持多种可靠性级别：

- **尽力而为 (Best effort)**：瞬时事件，无重放保证
- **至少一次 (At least once)**：持久化交付，可能有重复
- **恰好一次假象 (Exactly once illusion)**：消费者端使用事件 ID 进行幂等处理
- **可重放流 (Replayable stream)**：消费者可以从一个游标重新连接

协议应要求全局唯一的事件 ID，并推荐幂等的消费者。

## 安全模型

AEP 需要在身份、订阅和负载级别进行安全控制。

所需的概念：

- 生产者身份
- 消费者身份
- 基于能力范围的订阅
- 定向交付
- 可选的负载遮盖
- 对持久化部署的审计跟踪

第一个版本可以定义元数据钩子，而不规定完整的认证系统。

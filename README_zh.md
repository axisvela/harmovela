# Harmovela Protocol

> [English](README.md) | [规范站点](https://axisrobo.github.io/harmovela/)

**Harmovela Protocol** 是一个面向自主系统的开放协调协议。它定义了智能体、工具、记忆系统、上下文提供者、环境观察器和多智能体运行时如何在七个相互依存的维度上进行协调。

Harmovela 将七个相互依存的协调维度整合进一个开放协议：

| 维度 | 定义 |
|---|---|
| 事件 | 发生了什么 — 发布、订阅、关联、重放、确认。 |
| 任务 | 正在执行什么 — 从提交到完成、失败或取消的生命周期。 |
| 状态 | 当前事实 — 版本化状态、新鲜度窗口、失效、变更传播。 |
| 上下文/记忆 | 认知输入 — 更新、失效、溯源、检索就绪通知。 |
| 委派 | 谁做什么 — 分配、接受、交接、升级、取消传播。 |
| 恢复 | 故障应对 — 幂等、重放、检查点、中断、补偿。 |
| 治理 | 谁能做什么 — 身份、授权、审计、租户隔离、策略集成。 |

Harmovela 补充 MCP。MCP 仍是同步能力调用层；Harmovela 提供异步协调层——事件流、任务生命周期、状态管理、上下文感知、委派、恢复和治理。

## 愿景

自主系统需要的远不止同步工具调用。它们需要持续地感知、决策、行动、恢复和协调。Harmovela Protocol 为这一持续循环提供了开放的协调层。

Harmovela 融合了三种相互交织的品质：

- **连接与协作**：自主实体间的网络效应、随参与者增长而增强的集体智能、智能体与工具及运行时之间的对齐。
- **动态与进化**：对变化环境的持续适应、协调行为的涌现、上下文与状态随时间的流动。
- **秩序与治理**：通过可验证边界建立的信任、自主与约束之间的平衡、不确定性下的韧性协调。

## 关于协议

当前 0.2 草案是一个多语言协议仓库，包含：

- **17 份协议规范**：涵盖会话、订阅、任务、错误、版本、交付、可靠性、安全、一致性和传输层
- **4 个产品级实现**（TypeScript、Python、Go、Java）——每个均包含运行时守护进程、CLI、HTTP API、订阅、MCP 桥接和交付存储
- **~700 项测试**：跨四种语言，全部通过
- **7 种传输绑定**（stdio、WebSocket、SSE、gRPC、NATS、Kafka、Redis Streams）在全部语言中实现
- **SQLite 和 PostgreSQL 交付存储**：支持重试、死信、重放，并通过跨语言一致性验证
- **规范站点**：[axisrobo.github.io/harmovela](https://axisrobo.github.io/harmovela/)

## 范围

Harmovela 涵盖：

- **事件**：发布、订阅、关联、重放、确认——完整的事件生命周期。
- **任务**：从提交到接受、执行、推进、完成、失败或取消的完整生命周期——含超时、阻塞和输出流。
- **状态**：版本化状态、新鲜度窗口、失效、变更传播——当前事实。
- **上下文/记忆**：更新、失效、溯源、检索就绪通知——认知输入。
- **委派**：分配、接受、交接、升级、取消传播——谁做什么。
- **恢复**：幂等、重放、检查点、中断、补偿——故障应对。
- **治理**：身份、授权、审计、租户隔离、策略集成——谁能做什么。

Harmovela 不替代：

- MCP 同步工具调用
- LLM 补全 API
- 向量数据库 API
- 业务领域记忆模型
- 通用消息代理

## 与 MCP 的关系

| MCP | Harmovela |
| --- | --- |
| 同步请求/响应 | 异步协调流 |
| 工具调用 | 任务生命周期与工具反馈 |
| 资源读取 | 上下文更新、状态变化与失效通知 |
| 客户端发起调用 | 生产者驱动事件 |
| 即时结果 | 延迟、增量、可重放结果 |

Harmovela 应与 MCP 互操作而非分叉。Harmovela 可以承载关于 MCP 工具调用的事件流，但应保持协议独立性，以支持非 MCP 的智能体、工具、记忆系统、机器人系统、浏览器、IDE 和云运行时。

## 当前状态

Harmovela 是包含四个活跃参考实现（TypeScript、Python、Go、Java）的协议草案，各实现保持跨语言功能对等。仓库包含会话、订阅、任务生命周期、错误模型、版本、一致性、交付、可靠性、安全、事件注册治理的分层规范，以及七种传输绑定（stdio、WebSocket、SSE、gRPC、NATS、Kafka、Redis Streams）。每个参考实现均支持 SQLite 交付存储，跨语言一致性运行器（`node tools/conformance-runner.js`）验证所有四种语言的共享 fixtures。

## 文档

- `docs/vision.md`：愿景、目标、非目标和原则
- `docs/architecture.md`：系统架构和协议层
- `docs/protocol-design.md`：协议模型、envelope、事件和生命周期
- `docs/mcp-relationship.md`：与 MCP 的互操作模型
- `docs/roadmap.md`：版本路线与 beta、RC、1.0 门槛
- `docs/protocol/`：分层协议规范
- `docs/design/`：设计记录与执行计划

## 验证

```sh
cd implementations/typescript && npm install
cd implementations/typescript && npm test
node tools/conformance-runner.js
```

## 规范站点

渲染后的规范发布在 [https://axisrobo.github.io/harmovela/](https://axisrobo.github.io/harmovela/)。

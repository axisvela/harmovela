# Harmovela Protocol

> [English](README.md) | [规范站点](https://axisrobo.github.io/harmovela/)

**Harmovela Protocol** 是一个面向自主系统的开放协调协议。它定义了智能体、工具、记忆系统、上下文提供者、环境观察器和多智能体运行时如何在七个相互依存的维度上进行协调：

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

## 关于协议

当前 0.5 Adaptation Preview 是一个多语言协议仓库，包含：

- **27 份协议规范**：涵盖会话、订阅、任务、错误、版本、交付、可靠性、安全、一致性、传输层，以及适配预算、适配反馈、兼容性矩阵、事件契约、事件维度分类、治理契约、L1 策略表面、协议配置文件和集成场景
- **4 个产品级实现**（TypeScript、Python、Go、Java）——每个均包含运行时守护进程、CLI、HTTP API、订阅、MCP 桥接和交付存储
- **~800 项测试**：跨四种语言，全部通过
- **7 种传输绑定**（stdio、WebSocket、SSE、gRPC、NATS、Kafka、Redis Streams）在全部语言中实现
- **10+ 维度模块**：事件、恢复、治理、任务、状态、上下文/记忆、委派、工具、智能体、环境、适配
- **5 个基础设施模块**：Harness、Runtime、CLI、Conformance、MCP Bridge
- **SQLite 和 PostgreSQL 交付存储**：支持重试、死信、重放，并通过跨语言一致性验证
- **规范站点**：[axisrobo.github.io/harmovela](https://axisrobo.github.io/harmovela/)

## 愿景

自主系统需要的远不止同步工具调用。它们需要持续地感知、决策、行动、恢复和协调。Harmovela Protocol 为这一持续循环提供了开放的协调层。

Harmovela 融合了三种相互交织的品质：

- **连接与协作**：自主实体间的网络效应、随参与者增长而增强的集体智能、智能体与工具及运行时之间的对齐。
- **动态与进化**：对变化环境的持续适应、协调行为的涌现、上下文与状态随时间的流动。
- **秩序与治理**：通过可验证边界建立的信任、自主与约束之间的平衡、不确定性下的韧性协调。

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

## 文档

### 核心文档 (中文)

- `docs/vision.md`：愿景、目标、非目标和原则 ([中文](docs/zh/vision.md))
- `docs/architecture.md`：系统架构和主要协议层 ([中文](docs/zh/architecture.md))
- `docs/differentiation.md`：非规范性定位与对比材料 ([中文](docs/zh/differentiation.md))
- `docs/protocol-design.md`：协议模型、envelope、事件和生命周期 ([中文](docs/zh/protocol-design.md))
- `docs/mcp-relationship.md`：与 MCP 的详细对比与互操作模型
- `docs/roadmap.md`：通向可用开放协议的阶段路线 ([中文](docs/zh/roadmap.md))

### 协议规范 (`docs/protocol/`)

- `docs/protocol/session.md`：会话生命周期规范
- `docs/protocol/subscription.md`：订阅模型规范
- `docs/protocol/task-lifecycle.md`：任务生命周期规范
- `docs/protocol/error-model.md`：错误模型规范
- `docs/protocol/versioning.md`：版本管理规范
- `docs/protocol/transport-stdio.md`：stdio 传输规范
- `docs/protocol/transport-websocket.md`：WebSocket 传输规范
- `docs/protocol/transport-sse.md`：HTTP SSE 传输规范
- `docs/protocol/transport-grpc.md`：gRPC 流式传输规范
- `docs/protocol/transport-kafka.md`：Kafka 传输规范
- `docs/protocol/transport-nats.md`：NATS 传输规范
- `docs/protocol/transport-redis-streams.md`：Redis Streams 传输规范
- `docs/protocol/delivery.md`：交付语义、确认和重放规范
- `docs/protocol/reliability.md`：重试、持久化和死信处理规范
- `docs/protocol/security.md`：身份、授权、审计和租户隔离规范
- `docs/protocol/conformance.md`：一致性级别和共享fixture清单规范
- `docs/protocol/event-registry-governance.md`：事件类型注册治理和版本管理
- `docs/protocol/agent-runtime-semantics.md`：信念、新鲜度、委派、中断和溯源元数据
- `docs/protocol/adaptation-budget.md`：适配预算规范
- `docs/protocol/adaptation-feedback.md`：适配反馈规范
- `docs/protocol/compatibility-matrix.md`：迁移兼容性矩阵
- `docs/protocol/event-contract.md`：事件契约边界
- `docs/protocol/event-dimension-classification.md`：事件类型维度分类
- `docs/protocol/governance-contract.md`：治理契约边界
- `docs/protocol/l1-policy-surface.md`：L1 咨询策略表面
- `docs/protocol/profiles.md`：协议配置文件
- `docs/protocol/scenarios.md`：集成场景

### 设计文档 (`docs/design/`)

- `docs/design/`：Superpowers 支持的设计规格与实施计划

### 一致性验证

- `CONFORMANCE.md`：跨所有实现的公开一致性合规矩阵

### 治理

- `GOVERNANCE.md`：项目治理与决策
- `RELEASES.md`：发布阶段、版本管理与制品
- `TRADEMARKS.md`：名称和商标使用指南
- `LICENSE`：Apache License 2.0

### 指南

- `CONTRIBUTING.md`：贡献指南与仓库约定
- `CODE_OF_CONDUCT.md`：贡献者行为准则

## 仓库结构

- `docs/`：协议愿景、架构、设计草案、规范、路线图
- `docs/protocol/`：分层协议规范（会话、订阅、任务生命周期、错误模型、版本管理、传输层）
- `docs/design/`：Superpowers 支持的设计规格与实施计划
- `docs/zh/`：核心文档的中文翻译
- `docs/site/`：生成的规范站点（HTML）
- `schemas/`：共享 JSON Schema 草案资产
- `conformance/`：跨语言一致性的共享 fixtures
- `examples/`：基于场景的示例：quickstart、service-client、mcp-bridge、scenarios
- `implementations/`：各语言实现
- `implementations/typescript/`：TypeScript 实现（SDK、harmovelad 守护进程、harmovela CLI、HTTP API）
- `implementations/python/`：Python 实现（SDK、守护进程、CLI、HTTP API）
- `implementations/go/`：Go 实现（SDK、守护进程、CLI、HTTP API、子包布局）
- `implementations/java/`：Java 实现（SDK、守护进程、CLI、HTTP API、JDK 21）
- `.github/workflows/`：仓库 CI
- `tools/`：开发工具（一致性运行器、规范站点生成器）
- `.superpowers/`：Superpowers 规格、计划、技能与笔记
- `.opencode/`：OpenCode 智能体配置

## 开发工具链

本项目使用 Superpowers 作为智能体开发工具链。OpenCode 通过 `opencode.json` 加载；持久化的规格和计划位于 `.superpowers/` 下。

- `AGENTS.md` — OpenCode 项目规则
- `CLAUDE.md` — Claude Code 项目规则
- `.superpowers/specs/` — Superpowers 支持的设计规格
- `.superpowers/plans/` — Superpowers 支持的执行计划

## 验证

运行测试：

```sh
cd implementations/typescript && npm install
cd implementations/typescript && npm test
```

运行 TypeScript 一致性 fixtures：

```sh
cd implementations/typescript && npm run conformance
```

运行跨语言一致性验证：

```sh
node tools/conformance-runner.js
```

示例：

```sh
# TypeScript 快速入门
node examples/quickstart/runtime-embed.js

# Python 快速入门
PYTHONPATH=implementations/python/src python examples/quickstart/runtime-embed.py

# Go 快速入门 (从 Go 模块根目录)
cd implementations/go && go run ../../examples/quickstart/runtime-embed.go

# MCP 桥接
node examples/mcp-bridge/async-tool.js
```

## 规范站点

渲染后的规范发布在 [https://axisrobo.github.io/harmovela/](https://axisrobo.github.io/harmovela/)。

## 当前状态

Harmovela 是一个包含四个活跃参考实现（TypeScript、Python、Go、Java）的协议草案，各实现保持跨语言功能对等。仓库包含会话、订阅、任务生命周期、错误模型、版本管理、一致性、交付、可靠性、安全、事件注册治理的分层规范，以及七种传输绑定（stdio、WebSocket、SSE、gRPC、NATS、Kafka、Redis Streams）。每个参考实现均支持 SQLite 交付存储，跨语言一致性运行器（`node tools/conformance-runner.js`）验证所有四种语言的共享 fixtures。

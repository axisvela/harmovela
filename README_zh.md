# Axisrobo AEP

> [English](README.md) | [Spec Site](https://axisrobo.github.io/aep/)

**Agent Event Protocol (AEP)** 是一个提议中的开放协议，用于大语言模型智能体（Agent）、工具、记忆系统、上下文提供者、环境观察器和多智能体运行时之间的异步通信。

AEP 被设计为 MCP 的异步对等协议。MCP 擅长同步能力调用：列出工具、调用工具、读取资源并返回即时结果。AEP 专注 MCP 天然不覆盖的通信模式：事件流、长时间运行的任务生命周期、后台反馈、记忆更新、上下文失效、持久化交付、重放、取消和智能体间协调。

## 关于

AEP 0.1 草案是一个多语言协议仓库，包含：

- **17 个协议规范** 覆盖会话、订阅、任务、错误、版本控制、交付、可靠性、安全、一致性和传输层
- **4 个产品化实现**（TypeScript, Python, Go, Java）-- 每个都有运行时守护进程、CLI、HTTP API、订阅、MCP bridge 和交付存储
- **~700 个测试** 跨四种语言全部通过
- **7 个传输绑定**（stdio, WebSocket, SSE, gRPC, NATS, Kafka, Redis Streams）在所有语言中实现
- **SQLite 和 PostgreSQL 交付存储** 提供重试、死信、重放和跨语言一致性

## 愿景

智能体不仅应该能请求能力，还应该能监听、响应、协调和恢复。

AEP 定义了一个通用的事件模型，使得智能体可以从工具、其他智能体、记忆系统、外部环境和运行时基础设施接收异步反馈，而无需每个系统都发明自定义的回调、轮询或消息队列接口。

## 范围

AEP 覆盖：
- 异步事件和通知
- 发布/订阅通信
- 长时间运行的工具和任务生命周期
- 进度、输出、完成、失败、取消和超时事件
- 上下文和记忆变化流
- 环境观察流
- 智能体间消息
- 交付确认、重放和关联
- 本地和分布式运行时的传输绑定

AEP 不替代：
- MCP 同步工具调用
- LLM 补全 API
- 向量数据库 API
- 业务专用的记忆模式
- 通用消息代理

## 与 MCP 的关系

| MCP | AEP |
| --- | --- |
| 同步请求/响应 | 异步事件流 |
| 工具调用 | 任务生命周期和工具反馈 |
| 资源读取 | 上下文更新和失效 |
| 客户端驱动调用 | 生产者驱动事件 |
| 即时结果 | 延迟、增量、可重放的结果 |

AEP 应与 MCP 互操作而非分叉。AEP 可以传递关于 MCP 工具调用的事件，但应保持协议独立性，以支持非 MCP 的智能体、工具、记忆系统、机器人系统、浏览器、IDE 和云运行时。

## 文档

- `docs/vision.md` -- 项目愿景、目标、非目标和原则
- `docs/architecture.md` -- 系统架构和主要协议层
- `docs/protocol-design.md` -- 初始协议模型、信封、事件和生命周期
- `docs/mcp-relationship.md` -- 与 MCP 的详细比较和互操作模型
- `docs/roadmap.md` -- 路线图和阶段规划
- `docs/specs/session.md` -- 会话生命周期规范
- `docs/specs/subscription.md` -- 订阅模型规范
- `docs/specs/task-lifecycle.md` -- 任务生命周期规范
- `docs/specs/error-model.md` -- 错误模型规范
- `docs/specs/versioning.md` -- 版本控制规则规范
- `docs/specs/transport-stdio.md` -- stdio 传输规范
- `docs/specs/transport-websocket.md` -- WebSocket 传输规范
- `docs/specs/transport-sse.md` -- HTTP SSE 传输规范
- `docs/specs/transport-grpc.md` -- gRPC 流式传输规范
- `docs/specs/delivery.md` -- 交付语义、确认和重放规范
- `docs/specs/reliability.md` -- 重试、持久化和死信处理规范
- `docs/specs/security.md` -- 身份、授权、审计和租户隔离规范
- `CONTRIBUTING.md` -- 贡献指南和仓库约定
- `CODE_OF_CONDUCT.md` -- 贡献者行为准则

## 仓库布局

- `docs/` -- 协议愿景、架构、设计草稿、规范、路线图和 Superpowers 开发工件
- `docs/specs/` -- 按层组织的协议规范
- `schemas/` -- 共享 JSON Schema 资产
- `conformance/` -- 共享一致性夹具
- `implementations/` -- 语言特定的实现
- `implementations/typescript/` -- TypeScript 实现（SDK、守护进程、CLI、HTTP API）
- `implementations/python/` -- Python 实现（SDK、守护进程、CLI、HTTP API）
- `implementations/go/` -- Go 实现（SDK、守护进程、CLI、HTTP API、子包布局）
- `implementations/java/` -- Java 实现（SDK、守护进程、CLI、HTTP API、JDK 21）
- `.github/workflows/` -- 仓库 CI
- `examples/` -- 按场景组织的示例（quickstart、service-client、mcp-bridge、scenarios）

## 快速开始

TypeScript:
```sh
cd implementations/typescript && npm install && npm test
```

Python:
```sh
cd implementations/python && pip install -e . && python -m pytest
```

Go:
```sh
cd implementations/go && go test ./...
```

Java:
```sh
cd implementations/java && mvn test
```

运行示例 -- 见 `examples/` 目录：
```sh
# TypeScript 快速开始
node examples/quickstart/runtime-embed.js

# MCP bridge
node examples/mcp-bridge/async-tool.js
```

## 开发工具

本项目使用 Superpowers 作为智能体开发工具。OpenCode 通过 `opencode.json` 加载；持久化的规范和计划位于 `.superpowers/`。

- `AGENTS.md` -- OpenCode 项目规则
- `CLAUDE.md` -- Claude Code 项目规则

## 规范站点

渲染后的规范发布在 **[https://axisrobo.github.io/aep/](https://axisrobo.github.io/aep/)**。

## 状态

AEP 是一个草案开放协议，拥有四个活跃的产品化实现（TypeScript、Python、Go、Java），保持跨语言一致性。仓库包含按层组织的会话、订阅、任务生命周期、错误模型、版本控制、一致性、交付、可靠性、安全、事件注册表治理规范，以及七个传输绑定。每个实现支持 SQLite 和 PostgreSQL 交付存储，跨语言一致性运行器在全部四种语言上验证共享夹具。

# Harmovela Protocol

> [English](README.md) | [规范站点](https://axisrobo.github.io/harmovela/)

**Harmovela Protocol** 是一个面向自主系统的开放协调协议，适用于大语言模型智能体、工具、记忆系统、上下文提供者、环境观察器和多智能体运行时。

Harmovela 补充 MCP：MCP 负责同步能力发现与调用；Harmovela 负责异步事件、任务生命周期、状态与上下文变化、委派、恢复和治理语义。

## 范围

Harmovela 定义以下跨运行时协调能力：

- 事件发布、订阅、关联、确认与重放
- 长时间运行任务的接受、执行、阻塞、进度、完成、失败、取消与超时
- 记忆、上下文、环境和状态的更新与失效通知
- 智能体之间的消息、委派、交接、升级与取消传播
- 持久化交付、重试、死信、检查点、恢复与补偿
- 身份、授权、审计和租户隔离的治理边界

Harmovela 不替代 MCP、LLM 推理 API、向量数据库 API、业务领域数据模型或通用消息代理。

## 与 MCP 的关系

| MCP | Harmovela |
| --- | --- |
| 同步请求/响应 | 异步协调流 |
| 工具调用 | 任务生命周期与工具反馈 |
| 资源读取 | 上下文和状态更新、失效通知 |
| 客户端发起调用 | 生产者驱动事件 |
| 即时结果 | 延迟、增量、可重放结果 |

## 当前状态

当前 0.1 草案提供 TypeScript、Python、Go 和 Java 实现，以及共享 JSON Schema、跨语言 conformance fixtures、任务交付和多个 transport binding。协议的公开名称为 Harmovela；现有 draft wire 行为、CLI 和 Axisrobo package namespace 在版本化迁移完成前保持不变。

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

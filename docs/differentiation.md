# How AEP Differs From Existing Event Systems

> Status: non-normative positioning document. AEP is a draft protocol; this document does not add protocol requirements.

## Scope And Honest Baseline

AEP is intended to make asynchronous changes in agent systems interoperable. It builds on established event and messaging practice rather than replacing it.

- CloudEvents provides a broadly useful event metadata model and interoperable event-format mappings.
- AsyncAPI can describe asynchronous API operations, channels, messages, and transport bindings.
- Brokers such as Kafka, NATS, and Redis Streams provide durable or transient transport, routing, retention, consumer coordination, and broker-specific delivery behavior.
- Actor runtimes provide useful execution, isolation, supervision, mailbox, and message-passing models.
- Event sourcing provides a useful way to persist and reconstruct state from an append-only event history.

AEP does not claim a new generic event envelope, broker, delivery algorithm, or transport. Those are established infrastructure concerns. Instead, AEP registers a small set of agent-relevant event names and proposes relationship, lifecycle, and subscription conventions on top of that infrastructure. See the draft [protocol design](protocol-design.md), [delivery semantics](specs/delivery.md), and [task lifecycle](specs/task-lifecycle.md).

## What AEP Standardizes

The distinction is between an idea being new, being a consistently named recommended envelope field, and being supplied by infrastructure:

| Concern | AEP position |
| --- | --- |
| Generic event metadata and serialization | Established practice. AEP defines a draft envelope for its own events, but does not claim generic-envelope novelty. |
| `session_id`, `conversation_id`, and `task_id` | Recommended AEP envelope fields. Applications have modeled equivalent concepts before; the intended value is consistently named, interoperable use for agent events, not mandatory placement. |
| `correlation_id` and `causation_id` | Established distributed-systems concepts and recommended AEP envelope fields for operation grouping and immediate event lineage. |
| Task lifecycle event names and valid transitions | Agent-level protocol semantics. The task lifecycle defines a shared basis for producers and consumers to validate an observed task stream. |
| `context.invalidated` and `memory.fact.invalidated` | Registered AEP event types. Their detailed payload schemas and consumer semantics remain future specification work. |
| Filtering, acknowledgement, replay, retention, routing, and delivery implementation | Shared protocol concepts with transport-dependent realization. AEP does not replace broker capabilities or make stronger guarantees than its draft delivery specification. |

### Agent-Relevant Correlation

`session_id`, `conversation_id`, and `task_id` are distinct, composable scopes commonly used in an agent runtime:

- A `session_id` identifies a runtime connection or execution session.
- A `conversation_id` identifies an interaction thread.
- A `task_id` identifies a unit of asynchronous work.

This is not a claim that no prior application has modeled sessions, conversations, or tasks. The consistently named fields give independently developed agents, tools, context providers, and memory systems an interoperable way to attach an asynchronous event to the relevant runtime, interaction, or work scope. An event may carry any combination of these recommended fields; consumers must not infer containment or parentage from their presence alone. `correlation_id` can group a broader logical operation, while `causation_id` identifies the event that directly caused another event.

### Invalidation Is A Consumer Signal

The draft registers `context.invalidated` and `memory.fact.invalidated`, but does not yet define full payload schemas or normative consumer behavior for them. The intended application-level positioning is that a consumer which relied on prior context or a memory fact may evaluate whether to refresh, discard, annotate, or otherwise revise its working state. These events do not declare a universal truth-maintenance system, prove that every cached conclusion is false, or guarantee that any consumer will revise its beliefs. Detailed invalidation semantics remain future specification work.

## Comparison

The following comparisons describe intended roles, not claims that one system subsumes another.

| Capability | AEP | CloudEvents | AsyncAPI | Kafka, NATS, Redis Streams |
| --- | --- | --- | --- | --- |
| Session, conversation, and task correlation | Recommended, consistently named envelope fields: `session_id`, `conversation_id`, `task_id`, `correlation_id`, and `causation_id`. Their co-presence does not imply containment. | Generic extension attributes can carry these values; their agent meaning is not defined by CloudEvents. | Can document messages containing these fields, but does not define their runtime semantics. | Headers, keys, subjects, streams, and payloads can carry them; semantics are application-defined. |
| Task lifecycle validation | Draft shared event family and transition model for task streams. | Represents lifecycle events but does not define task states or transitions. | Documents lifecycle messages and channels but does not define transition validity. | Transports events; validation belongs to applications or consumers. |
| Context and memory invalidation | Registers `context.invalidated` and `memory.fact.invalidated`; payload schemas and normative consumer behavior remain future work. | Can carry invalidation events without defining their meaning. | Can describe invalidation messages without defining consumer action. | Transports invalidation messages without interpreting them. |
| Causation | `causation_id` is a recommended envelope field for direct event lineage. | Extension attributes can represent lineage. | Can describe a lineage field. | Metadata or payload convention chosen by the application. |
| Subscription filtering | Draft filters include event type, source, target, topic, session, conversation, task, time, and cursor. | No subscription protocol. | Describes subscription operations; does not provide a broker. | Native filtering varies by broker and binding. |
| Replay | Draft cursor-based replay and acknowledgement semantics, realized by capable transports. | No replay semantics. | Can document replay-capable bindings. | Support varies by product, retention policy, and consumer configuration. |
| Synchronous capability calls | Outside AEP's primary role; compose with MCP. | Not a call protocol. | Can describe request-reply patterns but is not the runtime call layer. | Request-reply may be available, but capability discovery and invocation semantics are application-defined. |

| Capability | AEP | Actor systems | Event sourcing | MCP |
| --- | --- | --- | --- | --- |
| Session, conversation, and task correlation | Recommended, consistently named envelope fields for distinct agent scopes; their co-presence does not imply containment. | Actor identity and message metadata can model relationships; no common agent correlation convention. | Aggregate and stream identities can relate events; agent scope relationships are application-specific. | Session and request identifiers are available where defined; task-level async relationship semantics are outside its core call model. |
| Task lifecycle validation | Shared draft lifecycle enables participants to interpret and validate task progress, completion, failure, and cancellation consistently. | Actors can implement a lifecycle in behavior and state; no interoperable lifecycle is implied. | Event histories can represent lifecycle changes; transition rules are domain-specific. | A synchronous call has request and result semantics; it does not standardize a general async task stream. |
| Context and memory invalidation | Registered event types; payload schemas and normative consumer behavior remain future work. | Actors may send such messages as application behavior. | Invalidation can be recorded as a domain event. | Notifications or tool results may expose changes, but no shared invalidation model is defined. |
| Causation | Recommended `causation_id` envelope field. | Can be modeled in message metadata or payload. | Can be modeled in event payloads. | Request IDs can associate a response with a request; event causation across an async graph is not its primary model. |
| Subscription filtering | AEP-level filter vocabulary over agent event attributes. | Actor mailboxes are usually addressed delivery rather than general subscriptions. | Projections and consumers select event streams by application convention; event sourcing does not define a general subscription filter model. | MCP does not define an AEP-style cross-source event subscription filter vocabulary; any subscription facility depends on the MCP feature and server. |
| Replay | Cursor-based replay is part of the draft delivery model when the transport supports it. | Usually not inherent to actor mailboxes. | Persisted histories can be re-read to rebuild projections or state; this is not a live delivery replay contract. | MCP does not define replay of a general asynchronous lifecycle event stream; recovery behavior depends on the server and transport. |
| Synchronous capability calls | Delegated to MCP or another call protocol. | Message asks and futures can support calls, but are runtime-specific. | Event sourcing records domain events and does not define capability invocation or request-reply. | MCP's primary role is capability discovery and synchronous invocation. |

## Composition Boundaries

AEP is designed to compose with, not replace, existing layers:

- A broker transports AEP events and supplies its own routing, persistence, ordering, and consumer mechanics.
- CloudEvents-compatible mappings are possible when an AEP deployment needs CloudEvents format or protocol bindings. Such a mapping must preserve the AEP fields and event semantics it uses.
- AsyncAPI can describe AEP channels, message schemas, and transport bindings. It is a description mechanism, not the event runtime.
- MCP remains the synchronous call layer for capability discovery, tool invocation, resource reading, and prompt retrieval. AEP carries changes and lifecycle events over time; it should not become a second synchronous tool protocol. See [AEP and MCP](mcp-relationship.md).
- Event-sourced systems may store AEP events, but AEP does not require event sourcing or prescribe how state is reconstructed.
- Actor runtimes may emit and consume AEP events, but AEP does not require actors or adopt a particular actor supervision or mailbox model.

## Current Limits

The draft semantics intentionally stop short of several agent-runtime concerns. These are areas for future specification, not current protocol guarantees:

- Belief revision: invalidation signals can prompt local revision, but AEP does not define a universal belief model or reconciliation algorithm.
- Delegation: task events can describe work, but delegated authority, ownership transfer, and subtask accountability need further definition.
- Provenance: `causation_id` provides direct event lineage only; evidence, source trust, and derivation chains need further definition.
- Freshness: timestamps, expiration, and invalidation can inform freshness decisions, but AEP does not define a universal freshness policy.
- Interruption: cancellation events exist in the draft task lifecycle, but interruption safety, rollback, partial effects, and cross-runtime guarantees need further definition.

Implementations should state their transport, retention, ordering, retry, authorization, and consumer-state policies explicitly. They should not infer guarantees beyond the draft [delivery semantics](specs/delivery.md) or the particular broker and binding they deploy.

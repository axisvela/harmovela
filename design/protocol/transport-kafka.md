# Harmovela Transport Binding: Kafka

> Status: draft. Part of the Harmovela 0.2 transport-kafka profile.

## Purpose

Define how Harmovela runs over Apache Kafka, supporting topic-based publish/subscribe with partition-based ordering and offset-based replay.

## Framing

Harmovela over Kafka uses JSON-encoded Harmovela events as Kafka message values:

- Each Kafka record value is a complete, valid JSON-encoded Harmovela event.
- Records are published to Kafka topics and consumed by consumer groups.
- The transport does not fragment events across multiple records.

### Message Key

The Kafka record key is derived from one of the following Harmovela envelope fields, in priority order:

| Priority | Field | Purpose |
|---|---|---|
| 1 | `task_id` | All events for a task land in the same partition |
| 2 | `conversation_id` | All events for a conversation are ordered |
| 3 | `session_id` | Events for a session are ordered |
| 4 | `source` | Events from the same producer are ordered |
| 5 | (none) | Round-robin across partitions |

### Message Headers

| Header | Harmovela Field | Type |
|---|---|---|
| `aep-type` | `type` | string |
| `aep-source` | `source` | string |
| `aep-session` | `session_id` | string |
| `aep-conversation` | `conversation_id` | string |
| `aep-task` | `task_id` | string |
| `aep-correlation` | `correlation_id` | string |
| `aep-causation` | `causation_id` | string |
| `aep-delivery-mode` | `delivery.mode` | string |

Headers enable consumers to filter and route without deserializing the message body.

## Topic Mapping

| Harmovela context | Kafka topic pattern | Example |
|---|---|---|
| Topic `tasks.task_01` | `aep.topic.tasks.task_01` | `aep.topic.tasks.task_01` |
| Source `agent:researcher` | `aep.source.agent.researcher` | `aep.source.agent.researcher` |
| Type pattern `task.*` | `aep.type.task.*` | Matches all task subtopics |
| Session | `aep.sess.<session_id>` | `aep.sess.sess_01` |
| All events | `aep.events` | Single-topic deployment |

The default topic prefix is `aep`. Implementations should allow per-envelope topic routing or single-topic deployment with header-based filtering.

## Delivery Modes

| Harmovela Delivery Mode | Kafka Mechanism |
|---|---|
| `best_effort` | Fire-and-forget producer with `acks=0` |
| `at_least_once` | Producer with `acks=1` or `acks=all`, consumer with manual commit after processing |
| `replayable` | Consumer with `auto.offset.reset=earliest`, replay by seeking to offset |

### At-Least-Once

- Producer: `enable.idempotence=true`, `acks=all` prevents duplicates from producer retries.
- Consumer: commit offset only after Harmovela `event.acknowledged` is emitted. On rebalance, uncommitted offsets are redelivered.

### Replayable

- Consumers track their own cursor (`consumer_group:topic:partition:offset`).
- Replay by seeking to a stored offset: `consumer.seek(partition, offset)`.
- Retention policy dictates maximum replay window.

## Consumer Groups

Harmovela sessions map to Kafka consumer groups:

| Session | Consumer Group |
|---|---|
| `sess_01` | `aep-sess_01` |
| Multiple agents sharing a session | Same group — events distributed across members |
| Independent sessions | Separate groups — each receives full event stream |

## Partitioning And Ordering

Ordering is guaranteed within a partition, not across partitions:

- Events sharing the same key land in the same partition and are ordered.
- Events with different keys may arrive out of order.
- Consumers must not assume global ordering.

For strict ordering, route all events through a single partition (`num.partitions=1`) or use a consistent key (e.g., `session_id`).

## Session Lifecycle

| Kafka State | Session State |
|---|---|
| Consumer connects and joins group | `CREATED` |
| Partition assignment received | `OPENED` |
| First event consumed | `READY` |
| Consumer leaves group (graceful) | `CLOSED` |
| Consumer session timeout | `ERROR` |

## Implementation Notes

- Use the native Kafka client for each language: `kafka-go` (Go), `kafkajs` (Node.js), `confluent-kafka` (Python), `kafka-clients` (Java).
- Producers should batch events when possible (`linger.ms`, `batch.size`).
- Consumers should use poll loops with configurable `max.poll.records`.
- Topic auto-creation should be opt-in, not default.

## References

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- Key-based partitioning, consumer groups, offset management, and transactional producers are Kafka-native concepts mapped to Harmovela semantics.

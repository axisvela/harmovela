# AEP Transport Binding: Redis Streams

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define how AEP runs over Redis Streams, supporting append-only event logs with consumer-group delivery, per-entry acknowledgement, and entry-ID-based replay.

## Framing

AEP over Redis Streams stores each AEP event as one stream entry:

- Each entry is appended with `XADD` and carries the AEP envelope as entry fields.
- The full JSON-encoded AEP event is stored in the `body` field; selected envelope fields are stored as flat fields for server-side filtering and inspection.
- The transport does not fragment events across multiple entries.

### Entry Fields

`XADD` entries carry the following fields, in addition to the `body` field holding the complete JSON-encoded event:

| Field | AEP Field | Type |
|---|---|---|
| `body` | (entire envelope) | JSON string |
| `aep-type` | `type` | string |
| `aep-source` | `source` | string |
| `aep-session` | `session_id` | string |
| `aep-conversation` | `conversation_id` | string |
| `aep-task` | `task_id` | string |
| `aep-correlation` | `correlation_id` | string |
| `aep-causation` | `causation_id` | string |
| `aep-delivery-mode` | `delivery.mode` | string |

Flat fields let consumers route or filter without deserializing `body`.

## Stream Key Mapping

| AEP context | Redis stream key | Example |
|---|---|---|
| Type pattern `task.*` | `aep.type.<type>` | `aep.type.task.progress` |
| Source `agent:researcher` | `aep.source.<source>` | `aep.source.agent:researcher` |
| Session | `aep.sess.<session_id>` | `aep.sess.sess_01` |
| All events | `aep.events` | Single-stream deployment |

The default stream prefix is `aep`. Implementations should allow per-envelope stream routing or a single-stream deployment with field-based filtering.

### Redis Cluster

In Redis Cluster, a stream key hashes to one slot. To co-locate related events on the same node, use hash tags in the stream key (e.g., `aep.{task_01}.type.task.progress`). Entries within a single stream are always totally ordered by entry ID.

## Delivery Modes

| AEP Delivery Mode | Redis Streams Mechanism |
|---|---|
| `best_effort` | `XADD` with `MAXLEN` capped; consumers read the tail with `XREAD` and do not track a group |
| `at_least_once` | Consumer group with `XREADGROUP`; `XACK` only after AEP `event.acknowledged` is emitted |
| `replayable` | Consumers store a cursor entry ID and replay with `XRANGE`/`XREAD` from that ID |

### At-Least-Once

- Consumers read with `XREADGROUP GROUP <group> <consumer> COUNT n STREAMS <key> >`.
- An entry stays in the group Pending Entries List (PEL) until `XACK`.
- Emit `XACK` only after the AEP `event.acknowledged` event is produced.
- On consumer failure, `XAUTOCLAIM` (or `XCLAIM`) reassigns idle pending entries to another consumer.

### Replayable

- Each entry has a monotonically increasing entry ID (`<ms>-<seq>`).
- Consumers persist their cursor as `group:key:entry_id`.
- Replay by reading with `XRANGE <key> <entry_id> +` or `XREAD ... STREAMS <key> <entry_id>`.
- `MAXLEN`/`MINID` retention dictates the maximum replay window.

## Consumer Groups

AEP sessions map to Redis Stream consumer groups:

| Session | Consumer Group |
|---|---|
| `sess_01` | `aep-sess_01` |
| (no session) | `aep-default` |
| Multiple agents sharing a session | Same group — entries distributed across members |
| Independent sessions | Separate groups — each receives the full stream |

Groups are created with `XGROUP CREATE <key> <group> $ MKSTREAM` (or `0` to consume history).

## Ordering

Entries within a single stream key are totally ordered by entry ID:

- Consumers in a group receive each entry once; ordering is preserved per stream.
- Events routed to different stream keys have no cross-stream ordering guarantee.
- For strict global ordering, route all events through a single stream (`aep.events`).

## Session Lifecycle

| Redis State | Session State |
|---|---|
| Consumer created, group joined (`XGROUP CREATECONSUMER`) | `CREATED` |
| First `XREADGROUP` returns assignment | `OPENED` |
| First entry consumed | `READY` |
| Consumer deleted (`XGROUP DELCONSUMER`) | `CLOSED` |
| Consumer idle beyond claim timeout | `ERROR` |

## Implementation Notes

- Use the native Redis client for each language: `go-redis` (Go), `ioredis`/`node-redis` (Node.js), `redis-py` (Python), `Jedis`/`Lettuce` (Java).
- Cap unbounded streams with `XADD ... MAXLEN ~ <n>` or trim with `XTRIM MINID`.
- Reclaim stuck entries with `XAUTOCLAIM` on a background interval.
- Group creation should be opt-in via `MKSTREAM`, not silently implicit.

## References

- [Redis Streams Introduction](https://redis.io/docs/latest/develop/data-types/streams/)
- Consumer groups, Pending Entries List, `XACK`, `XAUTOCLAIM`, and entry-ID replay are Redis-native concepts mapped to AEP semantics.

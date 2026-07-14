from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES

LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
    "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started", "tool.call.progress",
    "tool.call.output", "tool.call.completed", "tool.call.failed", "tool.call.cancel.requested", "tool.call.cancelled",
    "tool.call.timed_out", "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
    "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
    "agent.message.sent", "agent.message.received", "agent.message.failed", "agent.request.created", "agent.response.created",
    "agent.decision.recorded", "environment.observed", "environment.changed", "environment.alerted", "environment.error",
    "belief.revised", "belief.conflict.detected", "freshness.expired", "freshness.window.changed", "delegation.requested",
    "delegation.accepted", "delegation.rejected", "delegation.handoff.completed", "delegation.escalated", "interruption.requested",
    "interruption.acknowledged", "interruption.saved", "interruption.resumed", "interruption.cancelled", "compensation.requested",
    "compensation.completed",     "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
    "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated",
}.union(CONTEXT_MEMORY_EVENT_TYPES))
def is_legacy_dimension_event_type(type_: str) -> bool:
    return type_ in LEGACY_DIMENSION_EVENT_TYPES

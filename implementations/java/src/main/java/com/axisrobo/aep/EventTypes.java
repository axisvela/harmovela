package com.axisrobo.aep;

import java.util.Set;

public final class EventTypes {
    private EventTypes() {}

    private static final Set<String> LEGACY_TYPES = Set.of(
        "event.redelivered", "event.replayed", "event.dead_lettered",
        "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started",
        "tool.call.progress", "tool.call.output", "tool.call.completed", "tool.call.failed",
        "tool.call.cancel.requested", "tool.call.cancelled", "tool.call.timed_out",
        "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
        "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
        "context.updated", "context.invalidated", "context.snapshot.requested", "context.snapshot.ready",
        "context.retrieval.started", "context.retrieval.completed", "context.retrieval.failed",
        "memory.fact.added", "memory.fact.updated", "memory.fact.invalidated", "memory.episode.stored",
        "memory.preference.updated", "memory.constraint.updated", "memory.summary.ready", "memory.retrieval.ready",
        "agent.message.sent", "agent.message.received", "agent.message.failed",
        "agent.request.created", "agent.response.created", "agent.decision.recorded",
        "environment.observed", "environment.changed", "environment.alerted", "environment.error",
        "belief.revised", "belief.conflict.detected",
        "freshness.expired", "freshness.window.changed",
        "delegation.requested", "delegation.accepted", "delegation.rejected",
        "delegation.handoff.completed", "delegation.escalated",
        "interruption.requested", "interruption.acknowledged", "interruption.saved",
        "interruption.resumed", "interruption.cancelled",
        "compensation.requested", "compensation.completed",
        "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated"
    );

    public static boolean isStandardEventType(String type) {
        return type != null && (com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)
            || LEGACY_TYPES.contains(type));
    }
}

package com.axisrobo.harmovela.event.registry;

import java.util.Set;

public final class EventTypes {
    private EventTypes() {}

    public static final Set<String> STANDARD_TYPES = Set.of(
        "session.opened", "session.ready", "session.heartbeat", "session.closed", "session.error",
        "capabilities.requested", "capabilities.declared", "capabilities.changed",
        "subscription.requested", "subscription.created", "subscription.rejected",
        "subscription.cancelled", "subscription.expired",
        "event.acknowledged", "event.rejected", "event.redelivered", "event.dead_lettered",
        "task.submitted", "task.accepted", "task.started", "task.progress", "task.blocked",
        "task.output", "task.completed", "task.failed", "task.cancelled", "task.timed_out",
        "task.cancel.requested",
        "memory.updated", "memory.fact.added", "memory.fact.updated", "memory.fact.invalidated",
        "memory.episode.stored", "memory.preference.updated", "memory.constraint.updated",
        "memory.summary.ready", "memory.retrieval.ready",
        "context.updated", "context.invalidated",
        "context.snapshot.requested", "context.snapshot.ready",
        "context.retrieval.started", "context.retrieval.completed", "context.retrieval.failed",
        "belief.revised", "belief.conflict.detected",
        "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
        "interruption.requested", "interruption.acknowledged", "interruption.saved",
        "interruption.resumed", "interruption.cancelled",
        "compensation.requested", "compensation.completed",
        "freshness.expired",
        "delegation.requested", "delegation.accepted", "delegation.rejected",
        "delegation.escalated", "delegation.handoff.completed"
    );

    public static boolean isStandardEventType(String type) {
        return type != null && STANDARD_TYPES.contains(type);
    }
}

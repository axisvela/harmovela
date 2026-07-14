package com.axisrobo.aep;

import com.axisrobo.harmovela.context.ContextMemoryTypes;
import java.util.Set;
import java.util.HashSet;

public final class EventTypes {
    private EventTypes() {}

    private static final Set<String> LEGACY_TYPES;

    static {
        Set<String> types = new HashSet<>(Set.of(
            "event.redelivered", "event.replayed", "event.dead_lettered",
            "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started",
            "tool.call.progress", "tool.call.output", "tool.call.completed", "tool.call.failed",
            "tool.call.cancel.requested", "tool.call.cancelled", "tool.call.timed_out",
            "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
            "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
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
            "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
            "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated"
        ));
        types.addAll(ContextMemoryTypes.EVENT_TYPES);
        LEGACY_TYPES = Set.copyOf(types);
    }

    public static boolean isStandardEventType(String type) {
        return type != null && (com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)
            || LEGACY_TYPES.contains(type));
    }
}

package com.axisrobo.aep;

import com.axisrobo.harmovela.context.ContextMemoryTypes;
import com.axisrobo.harmovela.delegation.DelegationTypes;
import com.axisrobo.harmovela.recovery.RecoveryTypes;
import com.axisrobo.harmovela.state.StateTypes;
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
            "environment.observed", "environment.changed", "environment.alerted", "environment.error"
        ));
        types.addAll(ContextMemoryTypes.EVENT_TYPES);
        types.addAll(DelegationTypes.EVENT_TYPES);
        types.addAll(RecoveryTypes.EVENT_TYPES);
        types.addAll(StateTypes.EVENT_TYPES);
        LEGACY_TYPES = Set.copyOf(types);
    }

    public static boolean isStandardEventType(String type) {
        return type != null && (com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)
            || LEGACY_TYPES.contains(type));
    }
}

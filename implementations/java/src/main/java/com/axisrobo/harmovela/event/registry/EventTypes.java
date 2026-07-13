package com.axisrobo.harmovela.event.registry;

import java.util.Set;

public final class EventTypes {
    private EventTypes() {}

    public static final Set<String> STANDARD_TYPES = Set.of(
        "session.opened", "session.ready", "session.heartbeat", "session.closed", "session.error",
        "capabilities.requested", "capabilities.declared", "capabilities.changed",
        "subscription.requested", "subscription.created", "subscription.rejected",
        "subscription.cancelled", "subscription.expired",
        "event.acknowledged", "event.rejected"
    );

    public static boolean isStandardEventType(String type) {
        return type != null && STANDARD_TYPES.contains(type);
    }
}

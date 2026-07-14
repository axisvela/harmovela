package com.axisrobo.harmovela.delegation;

import java.util.Set;

public final class DelegationTypes {
    private DelegationTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "delegation.requested",
        "delegation.accepted",
        "delegation.rejected",
        "delegation.handoff.completed",
        "delegation.escalated"
    );

    public static boolean isDelegationEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

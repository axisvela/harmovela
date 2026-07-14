package com.axisrobo.harmovela.state;

import java.util.Set;

public final class StateTypes {
    private StateTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "state.snapshot.requested",
        "state.snapshot.ready",
        "state.delta.applied",
        "state.invalidated",
        "freshness.expired",
        "freshness.window.changed"
    );

    public static boolean isStateEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

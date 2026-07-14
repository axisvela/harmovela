package com.axisrobo.harmovela.environment;

import java.util.Set;

public final class EnvironmentTypes {
    private EnvironmentTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "environment.observed",
        "environment.changed",
        "environment.alerted",
        "environment.error"
    );

    public static boolean isEnvironmentEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

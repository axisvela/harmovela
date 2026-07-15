package com.axisrobo.harmovela.capability;

import java.util.Set;

public final class CapabilityTypes {
    private CapabilityTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "capability.registered",
        "capability.updated",
        "capability.deprecated",
        "capability.composed",
        "capability.validated"
    );

    public static boolean isCapabilityEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

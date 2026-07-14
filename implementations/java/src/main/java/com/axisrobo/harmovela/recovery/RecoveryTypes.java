package com.axisrobo.harmovela.recovery;

import java.util.Set;

public final class RecoveryTypes {
    private RecoveryTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "interruption.requested",
        "interruption.acknowledged",
        "interruption.saved",
        "interruption.resumed",
        "interruption.cancelled",
        "compensation.requested",
        "compensation.completed"
    );

    public static boolean isRecoveryEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

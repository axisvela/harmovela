package com.axisrobo.harmovela.command;

import java.util.Set;

public final class CommandTypes {
    private CommandTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "command.requested",
        "command.accepted",
        "command.rejected",
        "command.completed",
        "command.failed"
    );

    public static boolean isCommandEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

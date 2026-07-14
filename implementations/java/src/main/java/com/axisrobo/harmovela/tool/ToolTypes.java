package com.axisrobo.harmovela.tool;

import java.util.Set;

public final class ToolTypes {
    private ToolTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "tool.call.requested",
        "tool.call.accepted",
        "tool.call.rejected",
        "tool.call.started",
        "tool.call.progress",
        "tool.call.output",
        "tool.call.completed",
        "tool.call.failed",
        "tool.call.cancel.requested",
        "tool.call.cancelled",
        "tool.call.timed_out"
    );

    public static boolean isToolEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

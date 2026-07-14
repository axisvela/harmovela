package com.axisrobo.harmovela.agent;

import java.util.Set;

public final class AgentTypes {
    private AgentTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "agent.message.sent",
        "agent.message.received",
        "agent.message.failed",
        "agent.request.created",
        "agent.response.created",
        "agent.decision.recorded"
    );

    public static boolean isAgentEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

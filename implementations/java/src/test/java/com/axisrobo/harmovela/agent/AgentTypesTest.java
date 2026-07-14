package com.axisrobo.harmovela.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AgentTypesTest {
    @Test
    void includesAll6RegistryEntries() {
        assertEquals(6, AgentTypes.EVENT_TYPES.size());
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.message.sent"));
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.message.received"));
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.message.failed"));
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.request.created"));
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.response.created"));
        assertTrue(AgentTypes.EVENT_TYPES.contains("agent.decision.recorded"));
    }

    @Test
    void isAgentEventTypePositives() {
        assertTrue(AgentTypes.isAgentEventType("agent.message.sent"));
        assertTrue(AgentTypes.isAgentEventType("agent.message.received"));
        assertTrue(AgentTypes.isAgentEventType("agent.message.failed"));
        assertTrue(AgentTypes.isAgentEventType("agent.request.created"));
        assertTrue(AgentTypes.isAgentEventType("agent.response.created"));
        assertTrue(AgentTypes.isAgentEventType("agent.decision.recorded"));
    }

    @Test
    void isAgentEventTypeNegatives() {
        assertFalse(AgentTypes.isAgentEventType("task.submitted"));
        assertFalse(AgentTypes.isAgentEventType("session.opened"));
        assertFalse(AgentTypes.isAgentEventType("context.updated"));
        assertFalse(AgentTypes.isAgentEventType(""));
        assertFalse(AgentTypes.isAgentEventType(null));
    }
}

package com.axisrobo.harmovela.tool;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ToolTypesTest {
    @Test
    void includesAll11RegistryEntries() {
        assertEquals(11, ToolTypes.EVENT_TYPES.size());
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.requested"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.accepted"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.rejected"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.started"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.progress"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.output"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.completed"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.failed"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.cancel.requested"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.cancelled"));
        assertTrue(ToolTypes.EVENT_TYPES.contains("tool.call.timed_out"));
    }

    @Test
    void isToolEventTypePositives() {
        assertTrue(ToolTypes.isToolEventType("tool.call.requested"));
        assertTrue(ToolTypes.isToolEventType("tool.call.accepted"));
        assertTrue(ToolTypes.isToolEventType("tool.call.started"));
        assertTrue(ToolTypes.isToolEventType("tool.call.progress"));
        assertTrue(ToolTypes.isToolEventType("tool.call.completed"));
        assertTrue(ToolTypes.isToolEventType("tool.call.failed"));
        assertTrue(ToolTypes.isToolEventType("tool.call.cancelled"));
        assertTrue(ToolTypes.isToolEventType("tool.call.timed_out"));
    }

    @Test
    void isToolEventTypeNegatives() {
        assertFalse(ToolTypes.isToolEventType("task.submitted"));
        assertFalse(ToolTypes.isToolEventType("session.opened"));
        assertFalse(ToolTypes.isToolEventType("context.updated"));
        assertFalse(ToolTypes.isToolEventType(""));
        assertFalse(ToolTypes.isToolEventType(null));
    }
}

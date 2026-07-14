package com.axisrobo.harmovela.context;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContextMemoryTypesTest {
    @Test
    void includesAll15RegistryEntries() {
        assertEquals(15, ContextMemoryTypes.EVENT_TYPES.size());
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.invalidated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.snapshot.requested"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.snapshot.ready"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.started"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.completed"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.failed"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.added"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.invalidated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.episode.stored"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.preference.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.constraint.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.summary.ready"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.retrieval.ready"));
    }

    @Test
    void isContextMemoryEventTypePositives() {
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.updated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.invalidated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.fact.added"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.retrieval.ready"));
    }

    @Test
    void isContextMemoryEventTypeNegatives() {
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("task.submitted"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("session.opened"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("state.delta.applied"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType(""));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType(null));
    }
}

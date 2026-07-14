package com.axisrobo.harmovela.context;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContextMemoryTypesTest {
    @Test
    void includesAll20RegistryEntries() {
        assertEquals(20, ContextMemoryTypes.EVENT_TYPES.size());
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
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("belief.revised"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("belief.conflict.detected"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("provenance.attestation.added"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("provenance.attestation.revoked"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("provenance.chain.truncated"));
    }

    @Test
    void isContextMemoryEventTypePositives() {
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.updated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.invalidated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.fact.added"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.retrieval.ready"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("belief.revised"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("belief.conflict.detected"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("provenance.attestation.added"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("provenance.attestation.revoked"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("provenance.chain.truncated"));
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

package com.axisrobo.harmovela.state;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StateTypesTest {
    @Test
    void includesAllRegistryEntries() {
        assertEquals(6, StateTypes.EVENT_TYPES.size());
        assertTrue(StateTypes.EVENT_TYPES.contains("state.snapshot.requested"));
        assertTrue(StateTypes.EVENT_TYPES.contains("state.snapshot.ready"));
        assertTrue(StateTypes.EVENT_TYPES.contains("state.delta.applied"));
        assertTrue(StateTypes.EVENT_TYPES.contains("state.invalidated"));
        assertTrue(StateTypes.EVENT_TYPES.contains("freshness.expired"));
        assertTrue(StateTypes.EVENT_TYPES.contains("freshness.window.changed"));
    }

    @Test
    void isStateEventTypePositives() {
        assertTrue(StateTypes.isStateEventType("state.snapshot.requested"));
        assertTrue(StateTypes.isStateEventType("state.snapshot.ready"));
        assertTrue(StateTypes.isStateEventType("state.delta.applied"));
        assertTrue(StateTypes.isStateEventType("state.invalidated"));
        assertTrue(StateTypes.isStateEventType("freshness.expired"));
        assertTrue(StateTypes.isStateEventType("freshness.window.changed"));
    }

    @Test
    void isStateEventTypeNegatives() {
        assertFalse(StateTypes.isStateEventType("task.submitted"));
        assertFalse(StateTypes.isStateEventType("session.opened"));
        assertFalse(StateTypes.isStateEventType("context.updated"));
        assertFalse(StateTypes.isStateEventType(""));
        assertFalse(StateTypes.isStateEventType(null));
    }
}

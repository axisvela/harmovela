package com.axisrobo.harmovela.delegation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DelegationTypesTest {
    @Test
    void includesAll5RegistryEntries() {
        assertEquals(5, DelegationTypes.EVENT_TYPES.size());
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.requested"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.accepted"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.rejected"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.handoff.completed"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.escalated"));
    }

    @Test
    void isDelegationEventTypePositives() {
        assertTrue(DelegationTypes.isDelegationEventType("delegation.requested"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.accepted"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.handoff.completed"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.escalated"));
    }

    @Test
    void isDelegationEventTypeNegatives() {
        assertFalse(DelegationTypes.isDelegationEventType("task.submitted"));
        assertFalse(DelegationTypes.isDelegationEventType("session.opened"));
        assertFalse(DelegationTypes.isDelegationEventType("context.updated"));
        assertFalse(DelegationTypes.isDelegationEventType(""));
        assertFalse(DelegationTypes.isDelegationEventType(null));
    }
}

package com.axisrobo.harmovela.recovery;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RecoveryTypesTest {

    @Test
    void includesAll7RegistryEntries() {
        assertEquals(7, RecoveryTypes.EVENT_TYPES.size());
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("interruption.requested"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("interruption.acknowledged"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("interruption.saved"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("interruption.resumed"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("interruption.cancelled"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("compensation.requested"));
        assertTrue(RecoveryTypes.EVENT_TYPES.contains("compensation.completed"));
    }

    @Test
    void isRecoveryEventTypePositives() {
        assertTrue(RecoveryTypes.isRecoveryEventType("interruption.requested"));
        assertTrue(RecoveryTypes.isRecoveryEventType("interruption.acknowledged"));
        assertTrue(RecoveryTypes.isRecoveryEventType("interruption.saved"));
        assertTrue(RecoveryTypes.isRecoveryEventType("interruption.resumed"));
        assertTrue(RecoveryTypes.isRecoveryEventType("interruption.cancelled"));
        assertTrue(RecoveryTypes.isRecoveryEventType("compensation.requested"));
        assertTrue(RecoveryTypes.isRecoveryEventType("compensation.completed"));
    }

    @Test
    void isRecoveryEventTypeNegatives() {
        assertFalse(RecoveryTypes.isRecoveryEventType("task.submitted"));
        assertFalse(RecoveryTypes.isRecoveryEventType("session.opened"));
        assertFalse(RecoveryTypes.isRecoveryEventType("delegation.requested"));
        assertFalse(RecoveryTypes.isRecoveryEventType(""));
    }

    @Test
    void isRecoveryEventTypeHandlesNull() {
        assertFalse(RecoveryTypes.isRecoveryEventType(null));
    }
}

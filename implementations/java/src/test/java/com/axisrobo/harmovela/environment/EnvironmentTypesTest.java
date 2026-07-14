package com.axisrobo.harmovela.environment;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EnvironmentTypesTest {
    @Test
    void includesAll4RegistryEntries() {
        assertEquals(4, EnvironmentTypes.EVENT_TYPES.size());
        assertTrue(EnvironmentTypes.EVENT_TYPES.contains("environment.observed"));
        assertTrue(EnvironmentTypes.EVENT_TYPES.contains("environment.changed"));
        assertTrue(EnvironmentTypes.EVENT_TYPES.contains("environment.alerted"));
        assertTrue(EnvironmentTypes.EVENT_TYPES.contains("environment.error"));
    }

    @Test
    void isEnvironmentEventTypePositives() {
        assertTrue(EnvironmentTypes.isEnvironmentEventType("environment.observed"));
        assertTrue(EnvironmentTypes.isEnvironmentEventType("environment.changed"));
        assertTrue(EnvironmentTypes.isEnvironmentEventType("environment.alerted"));
        assertTrue(EnvironmentTypes.isEnvironmentEventType("environment.error"));
    }

    @Test
    void isEnvironmentEventTypeNegatives() {
        assertFalse(EnvironmentTypes.isEnvironmentEventType("task.submitted"));
        assertFalse(EnvironmentTypes.isEnvironmentEventType("session.opened"));
        assertFalse(EnvironmentTypes.isEnvironmentEventType("context.updated"));
        assertFalse(EnvironmentTypes.isEnvironmentEventType(""));
        assertFalse(EnvironmentTypes.isEnvironmentEventType(null));
    }
}

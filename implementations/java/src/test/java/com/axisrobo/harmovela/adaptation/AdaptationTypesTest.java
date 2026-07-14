package com.axisrobo.harmovela.adaptation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdaptationTypesTest {
    @Test
    void includesAll10RegistryEntries() {
        assertEquals(10, AdaptationTypes.EVENT_TYPES.size());
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.outcome.correlated"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.created"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.updated"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.achieved"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.abandoned"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.cost.exceeded"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.established"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.adjusted"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.limit_exceeded"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.exhausted"));
    }

    @Test
    void isAdaptationEventTypePositives() {
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.outcome.correlated"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.created"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.updated"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.achieved"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.abandoned"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.cost.exceeded"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.established"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.adjusted"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.limit_exceeded"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.exhausted"));
    }

    @Test
    void isAdaptationEventTypeNegatives() {
        assertFalse(AdaptationTypes.isAdaptationEventType("task.submitted"));
        assertFalse(AdaptationTypes.isAdaptationEventType("session.opened"));
        assertFalse(AdaptationTypes.isAdaptationEventType("context.updated"));
        assertFalse(AdaptationTypes.isAdaptationEventType(""));
        assertFalse(AdaptationTypes.isAdaptationEventType(null));
    }
}

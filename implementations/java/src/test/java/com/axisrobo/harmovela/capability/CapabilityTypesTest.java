package com.axisrobo.harmovela.capability;

import com.axisrobo.harmovela.event.envelope.Envelope;
import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

public class CapabilityTypesTest {

    @Test
    void eventTypesIncludesAllEntries() {
        assertEquals(Set.of(
            "capability.registered",
            "capability.updated",
            "capability.deprecated",
            "capability.composed",
            "capability.validated"
        ), CapabilityTypes.EVENT_TYPES);
    }

    @Test
    void isCapabilityEventTypePositives() {
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.registered"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.updated"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.deprecated"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.composed"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.validated"));
    }

    @Test
    void isCapabilityEventTypeNegatives() {
        assertFalse(CapabilityTypes.isCapabilityEventType("capabilities.requested"));
        assertFalse(CapabilityTypes.isCapabilityEventType("command.requested"));
        assertFalse(CapabilityTypes.isCapabilityEventType(null));
    }

    @Test
    void envelopeRegistryAcceptsCapabilityEventTypes() {
        for (var type : CapabilityTypes.EVENT_TYPES) {
            assertTrue(Envelope.isStandardEventType(type), "envelope registry missing " + type);
        }
    }
}

package com.axisrobo.harmovela.command;

import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CommandTypesTest {

    @Test
    void testCommandEventTypesIncludesAllEntries() {
        Set<String> expected = Set.of(
            "command.requested",
            "command.accepted",
            "command.rejected",
            "command.completed",
            "command.failed"
        );
        assertEquals(expected, CommandTypes.EVENT_TYPES);
        assertEquals(5, CommandTypes.EVENT_TYPES.size());
    }

    @Test
    void testIsCommandEventTypePositives() {
        assertTrue(CommandTypes.isCommandEventType("command.requested"));
        assertTrue(CommandTypes.isCommandEventType("command.accepted"));
        assertTrue(CommandTypes.isCommandEventType("command.rejected"));
        assertTrue(CommandTypes.isCommandEventType("command.completed"));
        assertTrue(CommandTypes.isCommandEventType("command.failed"));
    }

    @Test
    void testIsCommandEventTypeNegatives() {
        assertFalse(CommandTypes.isCommandEventType("task.submitted"));
        assertFalse(CommandTypes.isCommandEventType("session.opened"));
        assertFalse(CommandTypes.isCommandEventType("query.requested"));
        assertFalse(CommandTypes.isCommandEventType(""));
        assertFalse(CommandTypes.isCommandEventType(null));
    }
}

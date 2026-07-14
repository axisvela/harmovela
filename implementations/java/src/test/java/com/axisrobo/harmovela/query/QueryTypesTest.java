package com.axisrobo.harmovela.query;

import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class QueryTypesTest {

    @Test
    void testQueryEventTypesIncludesAllEntries() {
        Set<String> expected = Set.of(
            "query.requested",
            "query.response",
            "query.rejected",
            "query.error"
        );
        assertEquals(expected, QueryTypes.EVENT_TYPES);
        assertEquals(4, QueryTypes.EVENT_TYPES.size());
    }

    @Test
    void testIsQueryEventTypePositives() {
        assertTrue(QueryTypes.isQueryEventType("query.requested"));
        assertTrue(QueryTypes.isQueryEventType("query.response"));
        assertTrue(QueryTypes.isQueryEventType("query.rejected"));
        assertTrue(QueryTypes.isQueryEventType("query.error"));
    }

    @Test
    void testIsQueryEventTypeNegatives() {
        assertFalse(QueryTypes.isQueryEventType("task.submitted"));
        assertFalse(QueryTypes.isQueryEventType("session.opened"));
        assertFalse(QueryTypes.isQueryEventType("command.requested"));
        assertFalse(QueryTypes.isQueryEventType(""));
        assertFalse(QueryTypes.isQueryEventType(null));
    }
}

package com.axisrobo.aep.transport;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

class StdioTransportTest {

    @Test
    void parsesNdjsonEventsFromReader() throws Exception {
        var input = new StringReader(
            "{\"spec_version\":\"0.1\",\"id\":\"evt_01\",\"type\":\"session.opened\",\"source\":\"test\",\"created_at\":\"2026-07-10T10:00:00Z\",\"payload\":{}}\n" +
            "{\"spec_version\":\"0.1\",\"id\":\"evt_02\",\"type\":\"session.ready\",\"source\":\"test\",\"created_at\":\"2026-07-10T10:00:01Z\",\"payload\":{\"session_id\":\"s1\"}}\n" +
            "{\"spec_version\":\"0.1\",\"id\":\"evt_03\",\"type\":\"session.closed\",\"source\":\"test\",\"created_at\":\"2026-07-10T10:00:02Z\",\"payload\":{\"reason\":\"done\"}}\n"
        );
        var output = new StringWriter();
        var transport = new StdioTransport();

        var received = new ArrayList<Map<String, Object>>();
        transport.onMessage(received::add);

        transport.start(input, output);
        transport.stop();

        assertEquals(3, received.size());
        assertEquals("session.opened", received.get(0).get("type"));
        assertEquals("session.ready", received.get(1).get("type"));
        assertEquals("session.closed", received.get(2).get("type"));
    }

    @Test
    void capturesSentDataToWriter() throws Exception {
        var input = new StringReader("");
        var output = new StringWriter();
        var transport = new StdioTransport();

        transport.start(input, output);

        var event = Map.<String, Object>of(
            "spec_version", "0.2",
            "id", "evt_01",
            "type", "session.ready",
            "source", "test",
            "created_at", "2026-07-10T10:00:00Z",
            "payload", Map.of("session_id", "s1")
        );
        transport.send(event);
        transport.stop();

        var line = output.toString().trim();
        assertFalse(line.isEmpty(), "expected output, got empty");
        assertDoesNotThrow(() -> new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(line), "output is not valid JSON");

        var parsed = new com.fasterxml.jackson.databind.ObjectMapper()
            .readValue(line, Map.class);
        assertEquals("session.ready", parsed.get("type"));
    }

    @Test
    void ignoresEmptyLines() throws Exception {
        var input = new StringReader(
            "{\"spec_version\":\"0.1\",\"id\":\"evt_01\",\"type\":\"session.opened\",\"source\":\"test\",\"created_at\":\"2026-07-10T10:00:00Z\",\"payload\":{}}\n" +
            "\n" +
            "{\"spec_version\":\"0.1\",\"id\":\"evt_02\",\"type\":\"session.ready\",\"source\":\"test\",\"created_at\":\"2026-07-10T10:00:01Z\",\"payload\":{\"session_id\":\"s1\"}}\n" +
            "\n" +
            "\n"
        );
        var output = new StringWriter();
        var transport = new StdioTransport();

        var received = new ArrayList<Map<String, Object>>();
        transport.onMessage(received::add);

        transport.start(input, output);
        transport.stop();

        assertEquals(2, received.size(), "empty lines should be ignored");
    }

    @Test
    void reportsErrorOnMalformedJson() throws Exception {
        var input = new StringReader("not valid json\n");
        var output = new StringWriter();
        var transport = new StdioTransport();

        var errors = new ArrayList<Exception>();
        transport.onError(errors::add);

        transport.start(input, output);
        transport.stop();

        assertFalse(errors.isEmpty(), "expected error for malformed JSON");
    }
}

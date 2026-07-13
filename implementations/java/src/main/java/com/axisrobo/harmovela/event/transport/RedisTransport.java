package com.axisrobo.harmovela.event.transport;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class RedisTransport {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String addr;
    private final String stream;
    private final String prefix;
    private boolean started;

    public RedisTransport() {
        this("localhost:6379", "aep.events", "aep");
    }

    public RedisTransport(String addr, String stream, String prefix) {
        this.addr = addr == null || addr.isEmpty() ? "localhost:6379" : addr;
        this.stream = stream == null || stream.isEmpty() ? "aep.events" : stream;
        this.prefix = prefix == null || prefix.isEmpty() ? "aep" : prefix;
    }

    public String getAddr() { return addr; }
    public String getStream() { return stream; }
    public String getPrefix() { return prefix; }
    public boolean isRunning() { return started; }

    public void start() { started = true; }
    public void stop() { started = false; }

    public String streamKey(Map<String, Object> event) {
        String type = (String) event.get("type");
        if (type != null && !type.isEmpty()) return prefix + ".type." + type;
        String source = (String) event.get("source");
        if (source != null && !source.isEmpty()) return prefix + ".source." + source;
        return stream;
    }

    public String consumerGroup(Map<String, Object> event) {
        String sessId = (String) event.get("session_id");
        if (sessId != null && !sessId.isEmpty()) return prefix + "-" + sessId;
        return prefix + "-default";
    }

    public Map<String, String> entryFields(Map<String, Object> event) {
        Map<String, String> fields = new LinkedHashMap<>();
        try {
            fields.put("body", MAPPER.writeValueAsString(event));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("json marshal", e);
        }
        putIfPresent(fields, "aep-type", (String) event.get("type"));
        putIfPresent(fields, "aep-source", (String) event.get("source"));
        putIfPresent(fields, "aep-session", (String) event.get("session_id"));
        putIfPresent(fields, "aep-conversation", (String) event.get("conversation_id"));
        putIfPresent(fields, "aep-task", (String) event.get("task_id"));
        putIfPresent(fields, "aep-correlation", (String) event.get("correlation_id"));
        putIfPresent(fields, "aep-causation", (String) event.get("causation_id"));
        if (event.get("delivery") instanceof Map<?, ?> d && d.get("mode") instanceof String mode) {
            fields.put("aep-delivery-mode", mode);
        }
        return fields;
    }

    private static void putIfPresent(Map<String, String> map, String key, String value) {
        if (value != null && !value.isEmpty()) map.put(key, value);
    }
}

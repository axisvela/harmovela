package com.axisrobo.harmovela.event.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class KafkaTransport {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final List<String> brokers;
    private final String topic;
    private final String prefix;
    private boolean started;

    public KafkaTransport() {
        this(List.of("localhost:9092"), "aep.events", "aep");
    }

    public KafkaTransport(List<String> brokers, String topic, String prefix) {
        this.brokers = brokers.isEmpty() ? List.of("localhost:9092") : List.copyOf(brokers);
        this.topic = topic == null || topic.isEmpty() ? "aep.events" : topic;
        this.prefix = prefix == null || prefix.isEmpty() ? "aep" : prefix;
    }

    public List<String> getBrokers() { return brokers; }
    public String getTopic() { return topic; }
    public String getPrefix() { return prefix; }
    public boolean isRunning() { return started; }

    public void start() { started = true; }
    public void stop() { started = false; }

    public String messageKey(Map<String, Object> event) {
        String taskId = (String) event.get("task_id");
        if (taskId != null && !taskId.isEmpty()) return taskId;
        String convId = (String) event.get("conversation_id");
        if (convId != null && !convId.isEmpty()) return convId;
        String sessId = (String) event.get("session_id");
        if (sessId != null && !sessId.isEmpty()) return sessId;
        String source = (String) event.get("source");
        if (source != null && !source.isEmpty()) return source;
        return "";
    }

    public String targetTopic(Map<String, Object> event) {
        String type = (String) event.get("type");
        if (type != null && !type.isEmpty()) return prefix + ".type." + type;
        String source = (String) event.get("source");
        if (source != null && !source.isEmpty()) return prefix + ".source." + source;
        return topic;
    }

    public Map<String, String> messageHeaders(Map<String, Object> event) {
        Map<String, String> headers = new LinkedHashMap<>();
        putIfPresent(headers, "aep-type", (String) event.get("type"));
        putIfPresent(headers, "aep-source", (String) event.get("source"));
        putIfPresent(headers, "aep-session", (String) event.get("session_id"));
        putIfPresent(headers, "aep-conversation", (String) event.get("conversation_id"));
        putIfPresent(headers, "aep-task", (String) event.get("task_id"));
        putIfPresent(headers, "aep-correlation", (String) event.get("correlation_id"));
        putIfPresent(headers, "aep-causation", (String) event.get("causation_id"));
        if (event.get("delivery") instanceof Map<?, ?> d && d.get("mode") instanceof String mode) {
            headers.put("aep-delivery-mode", mode);
        }
        return headers;
    }

    private static void putIfPresent(Map<String, String> map, String key, String value) {
        if (value != null && !value.isEmpty()) map.put(key, value);
    }
}

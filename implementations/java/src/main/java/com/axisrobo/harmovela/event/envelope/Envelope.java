package com.axisrobo.harmovela.event.envelope;

import com.axisrobo.harmovela.event.registry.EventTypes;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Envelope {
    private Envelope() {}

    private static final Set<String> DELIVERY_MODES = Set.of("best_effort", "at_least_once", "replayable");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_DATE_TIME;

    public static List<String> validate(Map<String, Object> value) {
        var errors = new ArrayList<String>();
        if (value == null) return List.of("event must be a JSON object");

        requireString(value, "spec_version", errors);
        requireString(value, "id", errors);
        requireString(value, "type", errors);
        requireString(value, "source", errors);
        requireString(value, "created_at", errors);
        if (!value.containsKey("payload")) errors.add("payload is required");

        var type = (String) value.get("type");
        if (type != null && !EventTypes.isStandardEventType(type)) {
            errors.add("type is not in the standard draft registry: " + type);
        }
        var version = (String) value.get("spec_version");
        if (version != null && !"0.2".equals(version)) errors.add("unsupported protocol version: " + version);

        var ts = (String) value.get("created_at");
        if (ts != null) {
            try {
                ISO.parse(ts);
            } catch (DateTimeParseException e) {
                errors.add("created_at must be an ISO-compatible timestamp");
            }
        }
        if (value.containsKey("delivery")) validateDelivery(value.get("delivery"), errors);
        if ("subscription.requested".equals(type) && value.get("payload") instanceof Map<?, ?> payload) {
            validateSubscriptionPayload(payload, errors);
        }
        return errors;
    }

    private static void validateSubscriptionPayload(Map<?, ?> payload, List<String> errors) {
        if (payload.containsKey("types") && !isStringOrList(payload.get("types"))) {
            errors.add("subscription payload types must be a string or string array");
        }
        for (var field : List.of("source", "target", "topic", "session_id", "conversation_id", "task_id")) {
            if (payload.containsKey(field) && !isStringOrList(payload.get(field))) {
                errors.add("subscription payload " + field + " must be a string or string array");
            }
        }
    }

    private static void validateDelivery(Object delivery, List<String> errors) {
        if (!(delivery instanceof Map<?, ?> values)) {
            errors.add("delivery must be an object when present");
            return;
        }
        var mode = values.get("mode");
        if (mode instanceof String value && !DELIVERY_MODES.contains(value)) {
            errors.add("delivery.mode must be one of: best_effort, at_least_once, replayable");
        }
    }

    private static void requireString(Map<String, Object> value, String field, List<String> errors) {
        var fieldValue = value.get(field);
        if (!(fieldValue instanceof String string) || string.isEmpty()) {
            errors.add(field + " must be a non-empty string");
        }
    }

    private static boolean isStringOrList(Object value) {
        if (value instanceof String) return true;
        return value instanceof List<?> list && list.stream().allMatch(item -> item instanceof String);
    }
}

package com.axisrobo.aep;

import java.util.List;
import java.util.Map;

public final class Subscriptions {
    private Subscriptions() {}

    public static boolean matchesType(String pattern, String value) {
        if (pattern.equals("*") || pattern.equals(value)) return true;
        if (pattern.endsWith(".*")) {
            return value.startsWith(pattern.substring(0, pattern.length() - 1));
        }
        var patternParts = pattern.split("\\.");
        var valueParts = value.split("\\.");
        if (patternParts.length != valueParts.length) return false;
        for (int i = 0; i < patternParts.length; i++) {
            if (!patternParts[i].equals("*") && !patternParts[i].equals(valueParts[i])) {
                return false;
            }
        }
        return true;
    }

    public static boolean matches(Map<String, Object> filter, Map<String, Object> event) {
        var types = filter.get("types");
        if (types != null) {
            var type = event.get("type") instanceof String s ? s : "";
            if (!matchesTypeValue(types, type)) return false;
        }
        for (var field : new String[]{"source", "target", "topic", "session_id", "conversation_id", "task_id"}) {
            var expected = filter.get(field);
            if (expected == null) continue;
            if (!matchesValue(expected, event.get(field))) return false;
        }
        return true;
    }

    private static boolean matchesTypeValue(Object patterns, String value) {
        if (patterns instanceof String s) return matchesType(s, value);
        if (patterns instanceof List<?> list) {
            for (var item : list) {
                if (item instanceof String s && matchesType(s, value)) return true;
            }
        }
        return false;
    }

    private static boolean matchesValue(Object expected, Object actual) {
        if (expected instanceof List<?> list) {
            for (var item : list) {
                if (item.equals(actual)) return true;
            }
            return false;
        }
        return expected.equals(actual);
    }
}

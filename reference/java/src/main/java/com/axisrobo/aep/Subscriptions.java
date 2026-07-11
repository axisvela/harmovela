package com.axisrobo.aep;

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
}

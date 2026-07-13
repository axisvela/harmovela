package com.axisrobo.aep;

import java.util.Map;

public final class Subscriptions {
    private Subscriptions() {}

    public static boolean matchesType(String pattern, String value) {
        return com.axisrobo.harmovela.event.subscription.Subscriptions.matchesType(pattern, value);
    }

    public static boolean matches(Map<String, Object> filter, Map<String, Object> event) {
        return com.axisrobo.harmovela.event.subscription.Subscriptions.matches(filter, event);
    }
}

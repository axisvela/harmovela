package com.axisrobo.aep;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Envelope {
    private Envelope() {}

    public static List<String> validate(Map<String, Object> value) {
        if (value == null || value.get("type") instanceof String type
            && com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)) {
            return com.axisrobo.harmovela.event.envelope.Envelope.validate(value);
        }
        var adapted = new LinkedHashMap<>(value);
        var type = (String) value.get("type");
        adapted.put("type", "event.acknowledged");
        var errors = new java.util.ArrayList<>(com.axisrobo.harmovela.event.envelope.Envelope.validate(adapted));
        if (!EventTypes.isStandardEventType(type)) errors.add("type is not in the standard draft registry: " + type);
        return errors;
    }
}

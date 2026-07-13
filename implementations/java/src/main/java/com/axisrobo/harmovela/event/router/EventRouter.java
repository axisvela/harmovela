package com.axisrobo.harmovela.event.router;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

public class EventRouter {
    private record Handler(Predicate<Map<String, Object>> match, Function<Map<String, Object>, Object> handler) {}

    private final List<Handler> handlers = new ArrayList<>();

    public EventRouter on(Predicate<Map<String, Object>> match, Function<Map<String, Object>, Object> handler) {
        handlers.add(new Handler(match, handler));
        return this;
    }

    public EventRouter onAll(Function<Map<String, Object>, Object> handler) {
        return on(event -> true, handler);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> dispatch(Map<String, Object> event) {
        var results = new ArrayList<Map<String, Object>>();
        for (var handler : handlers) {
            if (!handler.match.test(event)) continue;
            var response = handler.handler.apply(event);
            if (response instanceof List<?> list) {
                for (var item : list) if (item instanceof Map<?, ?> value) results.add((Map<String, Object>) value);
            } else if (response instanceof Map<?, ?> value) {
                results.add((Map<String, Object>) value);
            }
        }
        return results;
    }
}

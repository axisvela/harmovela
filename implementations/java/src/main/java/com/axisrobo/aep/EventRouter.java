package com.axisrobo.aep;

import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

public class EventRouter {

    private record Handler(Predicate<Map<String, Object>> match,
                           Function<Map<String, Object>, Object> handler) {}

    private final List<Handler> handlers = new ArrayList<>();

    public EventRouter on(Predicate<Map<String, Object>> match,
                          Function<Map<String, Object>, Object> handler) {
        handlers.add(new Handler(match, handler));
        return this;
    }

    public EventRouter onAll(Function<Map<String, Object>, Object> handler) {
        handlers.add(new Handler(e -> true, handler));
        return this;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> dispatch(Map<String, Object> event) {
        var results = new ArrayList<Map<String, Object>>();
        for (var handler : handlers) {
            if (handler.match.test(event)) {
                var response = handler.handler.apply(event);
                if (response == null) continue;
                switch (response) {
                    case List<?> list -> {
                        for (var item : list) {
                            if (item instanceof Map<?, ?> m) {
                                results.add((Map<String, Object>) m);
                            }
                        }
                    }
                    case Map<?, ?> m -> results.add((Map<String, Object>) m);
                    default -> {}
                }
            }
        }
        return results;
    }
}

package com.axisrobo.aep;

import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

public class EventRouter extends com.axisrobo.harmovela.event.router.EventRouter {
    @Override
    public EventRouter on(Predicate<Map<String, Object>> match,
                           Function<Map<String, Object>, Object> handler) {
        super.on(match, handler);
        return this;
    }

    @Override
    public EventRouter onAll(Function<Map<String, Object>, Object> handler) {
        super.onAll(handler);
        return this;
    }
}

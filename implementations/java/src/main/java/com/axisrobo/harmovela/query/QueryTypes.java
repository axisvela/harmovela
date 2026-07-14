package com.axisrobo.harmovela.query;

import java.util.Set;

public final class QueryTypes {
    private QueryTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "query.requested",
        "query.response",
        "query.rejected",
        "query.error"
    );

    public static boolean isQueryEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

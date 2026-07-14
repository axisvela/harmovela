package com.axisrobo.harmovela.adaptation;

import java.util.Set;

public final class AdaptationTypes {
    private AdaptationTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "adaptation.outcome.correlated",
        "adaptation.goal.created",
        "adaptation.goal.updated",
        "adaptation.goal.achieved",
        "adaptation.goal.abandoned",
        "adaptation.cost.exceeded",
        "adaptation.budget.established",
        "adaptation.budget.adjusted",
        "adaptation.budget.limit_exceeded",
        "adaptation.budget.exhausted"
    );

    public static boolean isAdaptationEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}

ADAPTATION_EVENT_TYPES = frozenset({
    "adaptation.outcome.correlated",
    "adaptation.goal.created",
    "adaptation.goal.updated",
    "adaptation.goal.achieved",
    "adaptation.goal.abandoned",
    "adaptation.cost.exceeded",
    "adaptation.budget.established",
    "adaptation.budget.adjusted",
    "adaptation.budget.limit_exceeded",
    "adaptation.budget.exhausted",
})


def is_adaptation_event_type(type_: str) -> bool:
    return type_ in ADAPTATION_EVENT_TYPES


__all__ = ["ADAPTATION_EVENT_TYPES", "is_adaptation_event_type"]

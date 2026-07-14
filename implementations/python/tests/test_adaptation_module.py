from axisrobo_harmovela_adaptation import ADAPTATION_EVENT_TYPES, is_adaptation_event_type


def test_adaptation_event_types_includes_all_10_registry_entries():
    expected = {
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
    }
    assert ADAPTATION_EVENT_TYPES == expected
    assert len(ADAPTATION_EVENT_TYPES) == 10


def test_is_adaptation_event_type_positives():
    for typ in [
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
    ]:
        assert is_adaptation_event_type(typ) is True


def test_is_adaptation_event_type_negatives():
    for typ in ["task.submitted", "session.opened", "context.updated", ""]:
        assert is_adaptation_event_type(typ) is False

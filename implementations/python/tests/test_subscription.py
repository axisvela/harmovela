from axisrobo_harmovela_event import matches_type, subscription_matches


class TestSubscription:
    def test_wildcard_patterns(self):
        assert matches_type("memory.*", "memory.fact.added") is True
        assert matches_type("tool.call.*", "tool.call.progress") is True
        assert matches_type("tool.*.progress", "tool.call.progress") is True
        assert matches_type("context.*", "memory.fact.added") is False

    def test_subscription_routing(self):
        sub = {
            "types": ["memory.*", "context.*"],
            "source": ["memory:main"],
            "target": "agent:researcher",
            "conversation_id": "conv_01",
        }
        event = {
            "type": "memory.fact.added", "source": "memory:main",
            "target": "agent:researcher", "conversation_id": "conv_01",
        }
        assert subscription_matches(sub, event) is True
        assert subscription_matches(sub, {**event, "source": "memory:other"}) is False

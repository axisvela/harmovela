from axisrobo_harmovela_recovery import DeliveryTracker, retry_delay, DEFAULT_RETRY, InMemoryDeliveryStore, DeliveryJournal


def test_retry_delay_computes_exponential_backoff():
    delay = retry_delay(1)
    assert delay == 1000
    delay = retry_delay(2)
    assert delay == 2000
    delay = retry_delay(3)
    assert delay == 4000


def test_retry_delay_respects_max_backoff():
    delay = retry_delay(10)
    assert delay == DEFAULT_RETRY["max_backoff_ms"]


def test_tracker_assigns_monotonically_increasing_sequences():
    tracker = DeliveryTracker()
    seq1 = tracker.track("evt_001")
    seq2 = tracker.track("evt_002")
    assert seq1 == 1
    assert seq2 == 2


def test_tracker_acknowledges_events():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    result = tracker.ack("evt_001")
    assert result is True
    assert tracker.is_acknowledged("evt_001") is True
    assert tracker.is_pending("evt_001") is False


def test_tracker_nacks_and_retries():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    attempts = tracker.nack("evt_001")
    assert attempts == 2


def test_tracker_dead_letters_exhausted_events():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    dlq = tracker.dead_letter("evt_001")
    assert dlq is not None
    assert dlq["type"] == "event.dead_lettered"


def test_tracker_get_pending_for_subscription_filters():
    tracker = DeliveryTracker()
    tracker.track("evt_a", "sub_01")
    tracker.track("evt_b", "sub_02")
    filtered = tracker.get_pending_for_subscription("sub_01")
    assert len(filtered) == 1
    assert filtered[0]["eventId"] == "evt_a"


def test_tracker_stats_reports_comprehensive_state():
    tracker = DeliveryTracker()
    tracker.track("evt_a")
    tracker.track("evt_b")
    tracker.ack("evt_a")
    stats = tracker.stats
    assert stats["totalSequences"] == 2
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1


def test_tracker_uses_provided_store_and_journal():
    store = InMemoryDeliveryStore()
    journal = DeliveryJournal()
    tracker = DeliveryTracker(store=store, journal=journal)
    seq = tracker.track("evt_store_001")
    assert seq == 1
    assert store.is_pending("evt_store_001") is True
    tracker.ack("evt_store_001")
    assert store.is_acknowledged("evt_store_001") is True
    journal.append({"type": "task.submitted"})
    assert journal.get_stats()["totalEvents"] == 2
    stats = tracker.stats
    assert stats["pending"] == 0
    assert stats["acknowledged"] == 1

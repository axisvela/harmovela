from axisrobo_harmovela_recovery import DeliveryJournal


def test_appends_events_with_sequence():
    journal = DeliveryJournal()
    seq1 = journal.append({"type": "task.submitted", "task_id": "task_01"})
    seq2 = journal.append({"type": "task.completed", "task_id": "task_01"})
    assert seq1 == 1
    assert seq2 == 2


def test_replays_events_since_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "task.submitted"})
    journal.append({"type": "task.started"})
    journal.append({"type": "task.completed"})
    events = journal.replay("stream_01:1")
    assert len(events) == 2
    assert events[0]["type"] == "task.started"
    assert events[1]["type"] == "task.completed"


def test_replays_all_events_with_default_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "task.submitted"})
    journal.append({"type": "task.started"})
    events = journal.replay()
    assert len(events) == 2


def test_purges_events_before_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "evt_1"})
    journal.append({"type": "evt_2"})
    journal.append({"type": "evt_3"})
    removed = journal.purge("stream_01:2")
    assert removed == 2
    events = journal.replay()
    assert len(events) == 1
    assert events[0]["type"] == "evt_3"


def test_provides_stats():
    journal = DeliveryJournal()
    journal.append({"type": "evt_1"})
    journal.append({"type": "evt_2"})
    stats = journal.get_stats()
    assert stats["totalEvents"] == 2
    assert stats["oldestSequence"] == 1
    assert stats["newestSequence"] == 2


def test_stats_are_empty_for_new_journal():
    journal = DeliveryJournal()
    stats = journal.get_stats()
    assert stats["totalEvents"] == 0
    assert stats["oldestSequence"] is None
    assert stats["newestSequence"] is None

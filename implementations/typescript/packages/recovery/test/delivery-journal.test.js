import assert from "node:assert/strict";
import test from "node:test";
import { DeliveryJournal } from "@axisrobo/harmovela-recovery";

test("DeliveryJournal appends events with sequence", () => {
  const journal = new DeliveryJournal();
  const seq1 = journal.append({ type: "task.submitted", task_id: "task_01" });
  const seq2 = journal.append({ type: "task.completed", task_id: "task_01" });
  assert.equal(seq1, 1);
  assert.equal(seq2, 2);
});

test("DeliveryJournal replays events since cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "task.submitted" });
  journal.append({ type: "task.started" });
  journal.append({ type: "task.completed" });

  const events = journal.replay("stream_01:1");
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "task.started");
  assert.equal(events[1].type, "task.completed");
});

test("DeliveryJournal replays all events with default cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "task.submitted" });
  journal.append({ type: "task.started" });

  const events = journal.replay();
  assert.equal(events.length, 2);
});

test("DeliveryJournal purges events before cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "evt_1" });
  journal.append({ type: "evt_2" });
  journal.append({ type: "evt_3" });

  const removed = journal.purge("stream_01:2");
  assert.equal(removed, 2);

  const events = journal.replay();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "evt_3");
});

test("DeliveryJournal provides stats", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "evt_1" });
  journal.append({ type: "evt_2" });

  const stats = journal.getStats();
  assert.equal(stats.totalEvents, 2);
  assert.equal(stats.oldestSequence, 1);
  assert.equal(stats.newestSequence, 2);
});

test("DeliveryJournal stats are empty for new journal", () => {
  const journal = new DeliveryJournal();
  const stats = journal.getStats();
  assert.equal(stats.totalEvents, 0);
  assert.equal(stats.oldestSequence, null);
  assert.equal(stats.newestSequence, null);
});

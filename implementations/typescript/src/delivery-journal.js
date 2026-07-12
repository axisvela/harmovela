export class DeliveryJournal {
  constructor(options = {}) {
    this._streamId = options.streamId ?? "stream_01";
    this._events = [];
    this._sequence = 0;
  }

  nextSequence() {
    return ++this._sequence;
  }

  append(event) {
    const seq = this.nextSequence();
    const record = {
      ...event,
      _journal_sequence: seq,
      _journal_cursor: `${this._streamId}:${seq}`,
      _journal_appendedAt: new Date().toISOString()
    };
    this._events.push(record);
    return seq;
  }

  replay(cursor) {
    if (!cursor) return [...this._events];
    const parts = cursor.split(":");
    const sinceSeq = parseInt(parts[1] ?? "0", 10);
    return this._events.filter((e) => e._journal_sequence > sinceSeq);
  }

  replaySinceSequence(seq) {
    return this._events.filter((e) => e._journal_sequence > seq);
  }

  purge(cursor) {
    const parts = cursor.split(":");
    const beforeSeq = parseInt(parts[1] ?? "0", 10);
    let removed = 0;
    while (this._events.length > 0 && this._events[0]._journal_sequence <= beforeSeq) {
      this._events.shift();
      removed++;
    }
    return removed;
  }

  getStats() {
    return {
      totalEvents: this._events.length,
      oldestSequence: this._events.length > 0 ? this._events[0]._journal_sequence : null,
      newestSequence: this._events.length > 0 ? this._events[this._events.length - 1]._journal_sequence : null
    };
  }
}

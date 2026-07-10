package aep

import (
	"strconv"
	"strings"
	"time"
)

type DeliveryJournal struct {
	streamId string
	events   []map[string]any
	sequence int
}

func NewDeliveryJournal(streamId string) *DeliveryJournal {
	return &DeliveryJournal{
		streamId: streamId,
	}
}

func (j *DeliveryJournal) NextSequence() int {
	j.sequence++
	return j.sequence
}

func (j *DeliveryJournal) Append(event map[string]any) int {
	seq := j.NextSequence()
	record := make(map[string]any)
	for k, v := range event {
		record[k] = v
	}
	record["_journal_sequence"] = seq
	record["_journal_cursor"] = j.streamId + ":" + strconv.Itoa(seq)
	record["_journal_appendedAt"] = time.Now().UTC().Format(time.RFC3339)
	j.events = append(j.events, record)
	return seq
}

func (j *DeliveryJournal) Replay(cursor string) []map[string]any {
	if cursor == "" {
		result := make([]map[string]any, len(j.events))
		copy(result, j.events)
		return result
	}
	parts := strings.Split(cursor, ":")
	sinceSeq := 0
	if len(parts) > 1 {
		sinceSeq, _ = strconv.Atoi(parts[1])
	}
	var result []map[string]any
	for _, e := range j.events {
		if e["_journal_sequence"].(int) > sinceSeq {
			result = append(result, e)
		}
	}
	return result
}

func (j *DeliveryJournal) ReplaySinceSequence(seq int) []map[string]any {
	var result []map[string]any
	for _, e := range j.events {
		if e["_journal_sequence"].(int) > seq {
			result = append(result, e)
		}
	}
	return result
}

func (j *DeliveryJournal) Purge(cursor string) int {
	parts := strings.Split(cursor, ":")
	beforeSeq := 0
	if len(parts) > 1 {
		beforeSeq, _ = strconv.Atoi(parts[1])
	}
	removed := 0
	for len(j.events) > 0 && j.events[0]["_journal_sequence"].(int) <= beforeSeq {
		j.events = j.events[1:]
		removed++
	}
	return removed
}

func (j *DeliveryJournal) GetStats() map[string]any {
	stats := make(map[string]any)
	stats["totalEvents"] = len(j.events)
	if len(j.events) > 0 {
		stats["oldestSequence"] = j.events[0]["_journal_sequence"]
		stats["newestSequence"] = j.events[len(j.events)-1]["_journal_sequence"]
	} else {
		stats["oldestSequence"] = nil
		stats["newestSequence"] = nil
	}
	return stats
}

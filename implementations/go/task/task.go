package task

import (
	"fmt"
	"time"
)

type State string

const (
	Submitted State = "submitted"
	Accepted  State = "accepted"
	Started   State = "started"
	Progress  State = "progress"
	Blocked   State = "blocked"
	Output    State = "output"
	Completed State = "completed"
	Failed    State = "failed"
	Cancelled State = "cancelled"
	TimedOut  State = "timed_out"
)

const TaskTimeout = "task_timeout"

var eventToState = map[string]State{
	"task.submitted": Submitted,
	"task.accepted":  Accepted,
	"task.started":   Started,
	"task.progress":  Progress,
	"task.blocked":   Blocked,
	"task.output":    Output,
	"task.completed": Completed,
	"task.failed":    Failed,
	"task.cancelled": Cancelled,
	"task.timed_out": TimedOut,
}

var terminalStates = map[State]bool{
	Completed: true,
	Failed:    true,
	Cancelled: true,
	TimedOut:  true,
}

var transitions = map[State]map[State]bool{
	Submitted: {Accepted: true, Failed: true, Cancelled: true, TimedOut: true},
	Accepted:  {Started: true, Failed: true, Cancelled: true, TimedOut: true},
	Started:   {Progress: true, Output: true, Blocked: true, Completed: true, Failed: true, Cancelled: true, TimedOut: true},
	Blocked:   {Started: true, Progress: true, Failed: true, Cancelled: true, TimedOut: true},
	Progress:  {Progress: true, Output: true, Blocked: true, Completed: true, Failed: true, Cancelled: true, TimedOut: true},
	Output:    {Progress: true, Output: true, Blocked: true, Completed: true, Failed: true, Cancelled: true, TimedOut: true},
}

func errorPayload(code, message string, retryable bool) map[string]any {
	return map[string]any{
		"code":      code,
		"message":   message,
		"retryable": retryable,
		"details":   map[string]any{},
	}
}

type Tracker struct {
	ID          string
	State       State
	Source      string
	Description string
	eventID     int
}

func NewTracker(id, source, description string) *Tracker {
	return &Tracker{
		ID:          id,
		State:       Submitted,
		Source:      source,
		Description: description,
	}
}

func (t *Tracker) Accept() map[string]any {
	return t.Transition("task.accepted", nil)
}

func (t *Tracker) Accepted() map[string]any {
	return t.Transition("task.accepted", nil)
}

func (t *Tracker) Started() map[string]any {
	return t.Transition("task.started", nil)
}

func (t *Tracker) Progress(payload map[string]any) map[string]any {
	return t.Transition("task.progress", payload)
}

func (t *Tracker) Completed(result map[string]any) map[string]any {
	return t.Transition("task.completed", result)
}

func (t *Tracker) Failed(code, message string) map[string]any {
	return t.Transition("task.failed", map[string]any{
		"error": errorPayload(code, message, false),
	})
}

func (t *Tracker) IsTerminal() bool {
	return terminalStates[t.State]
}

func (t *Tracker) Transition(eventType string, payload map[string]any) map[string]any {
	nextState, ok := eventToState[eventType]
	if !ok {
		return nil
	}

	if nextState != t.State {
		allowed, hasAllowed := transitions[t.State]
		if !hasAllowed || !allowed[nextState] {
			return nil
		}
	}

	t.State = nextState

	result := make(map[string]any, len(payload)+2)
	if payload != nil {
		for k, v := range payload {
			result[k] = v
		}
	}
	result["task_id"] = t.ID
	result["state"] = string(t.State)

	if terminalStates[t.State] {
		if _, ok := result["result"]; !ok {
			result["result"] = string(t.State)
		}
	}

	t.eventID++
	return map[string]any{
		"spec_version": "0.2",
		"id":           fmt.Sprintf("evt_task_%06d", t.eventID),
		"type":         eventType,
		"source":       t.Source,
		"task_id":      t.ID,
		"created_at":   time.Now().UTC().Format(time.RFC3339),
		"payload":      result,
	}
}

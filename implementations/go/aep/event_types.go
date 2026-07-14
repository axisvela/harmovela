package aep

import (
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/delegation"
	"github.com/axisrobo/harmovela/event"
	"github.com/axisrobo/harmovela/recovery"
	"github.com/axisrobo/harmovela/state"
)

var legacyStandardEventTypes = func() map[string]bool {
	m := map[string]bool{
		"event.redelivered":             true,
		"event.replayed":                true,
		"event.dead_lettered":           true,
		"tool.call.requested":           true,
		"tool.call.accepted":            true,
		"tool.call.rejected":            true,
		"tool.call.started":             true,
		"tool.call.progress":            true,
		"tool.call.output":              true,
		"tool.call.completed":           true,
		"tool.call.failed":              true,
		"tool.call.cancel.requested":    true,
		"tool.call.cancelled":           true,
		"tool.call.timed_out":           true,
		"task.submitted":                true,
		"task.accepted":                 true,
		"task.started":                  true,
		"task.blocked":                  true,
		"task.progress":                 true,
		"task.output":                   true,
		"task.completed":                true,
		"task.failed":                   true,
		"task.cancel.requested":         true,
		"task.cancelled":                true,
		"task.timed_out":                true,
		"agent.message.sent":            true,
		"agent.message.received":        true,
		"agent.message.failed":          true,
		"agent.request.created":         true,
		"agent.response.created":        true,
		"agent.decision.recorded":       true,
		"environment.observed":          true,
		"environment.changed":           true,
		"environment.alerted":           true,
		"environment.error":             true,
	}
	for k, v := range context.EventTypes {
		m[k] = v
	}
	for k, v := range delegation.EventTypes {
		m[k] = v
	}
	for k, v := range recovery.EventTypes {
		m[k] = v
	}
	for k, v := range state.EventTypes {
		m[k] = v
	}
	return m
}()

// IsStandardEventType reports whether a type is supported by the legacy aep adapter.
func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}

package aep

import (
	"github.com/axisrobo/harmovela/agent"
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/delegation"
	"github.com/axisrobo/harmovela/environment"
	"github.com/axisrobo/harmovela/event"
	"github.com/axisrobo/harmovela/recovery"
	"github.com/axisrobo/harmovela/state"
	"github.com/axisrobo/harmovela/tool"
)

var legacyStandardEventTypes = func() map[string]bool {
	m := map[string]bool{
		"event.redelivered":             true,
		"event.replayed":                true,
		"event.dead_lettered":           true,
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
	}
	for k, v := range agent.EventTypes {
		m[k] = v
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
	for k, v := range tool.EventTypes {
		m[k] = v
	}
	for k, v := range environment.EventTypes {
		m[k] = v
	}
	return m
}()

// IsStandardEventType reports whether a type is supported by the legacy aep adapter.
func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}

package harness

import (
	"time"

	"github.com/axisvela/harmovela/adaptation"
	"github.com/axisvela/harmovela/agent"
	"github.com/axisvela/harmovela/command"
	"github.com/axisvela/harmovela/context"
	"github.com/axisvela/harmovela/delegation"
	"github.com/axisvela/harmovela/environment"
	"github.com/axisvela/harmovela/event"
	"github.com/axisvela/harmovela/query"
	"github.com/axisvela/harmovela/recovery"
	"github.com/axisvela/harmovela/state"
	"github.com/axisvela/harmovela/tool"
)

func Now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

var terminalTaskEventTypes = map[string]bool{
	"task.completed": true,
	"task.failed":    true,
	"task.cancelled": true,
	"task.timed_out": true,
}

func isTerminalTaskEventType(typ string) bool {
	return terminalTaskEventTypes[typ]
}

var legacyStandardEventTypes = func() map[string]bool {
	m := map[string]bool{
		"event.redelivered":     true,
		"event.replayed":        true,
		"event.dead_lettered":   true,
		"task.submitted":        true,
		"task.accepted":         true,
		"task.started":          true,
		"task.blocked":          true,
		"task.progress":         true,
		"task.output":           true,
		"task.completed":        true,
		"task.failed":           true,
		"task.cancel.requested": true,
		"task.cancelled":        true,
		"task.timed_out":        true,
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
	for k, v := range adaptation.EventTypes {
		m[k] = v
	}
	for k, v := range command.EventTypes {
		m[k] = v
	}
	for k, v := range query.EventTypes {
		m[k] = v
	}
	return m
}()

func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}

func ValidateEnvelope(value map[string]any) []string {
	if value == nil {
		return event.ValidateEnvelope(value)
	}
	typ, isString := value["type"].(string)
	if !isString || event.IsStandardEventType(typ) {
		return event.ValidateEnvelope(value)
	}

	adapted := make(map[string]any, len(value))
	for key, item := range value {
		adapted[key] = item
	}
	adapted["type"] = "event.acknowledged"
	errs := event.ValidateEnvelope(adapted)
	if !IsStandardEventType(typ) {
		errs = append(errs, "type is not in the standard draft registry: "+typ)
	}
	return errs
}

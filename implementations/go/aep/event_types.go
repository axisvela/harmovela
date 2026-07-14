package aep

import (
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/event"
)

var legacyStandardEventTypes = func() map[string]bool {
	m := map[string]bool{
		"event.redelivered":              true,
		"event.replayed":                 true,
		"event.dead_lettered":            true,
		"tool.call.requested":            true,
		"tool.call.accepted":             true,
		"tool.call.rejected":             true,
		"tool.call.started":              true,
		"tool.call.progress":             true,
		"tool.call.output":               true,
		"tool.call.completed":            true,
		"tool.call.failed":               true,
		"tool.call.cancel.requested":     true,
		"tool.call.cancelled":            true,
		"tool.call.timed_out":            true,
		"task.submitted":                 true,
		"task.accepted":                  true,
		"task.started":                   true,
		"task.blocked":                   true,
		"task.progress":                  true,
		"task.output":                    true,
		"task.completed":                 true,
		"task.failed":                    true,
		"task.cancel.requested":          true,
		"task.cancelled":                 true,
		"task.timed_out":                 true,
		"agent.message.sent":             true,
		"agent.message.received":         true,
		"agent.message.failed":           true,
		"agent.request.created":          true,
		"agent.response.created":         true,
		"agent.decision.recorded":        true,
		"environment.observed":           true,
		"environment.changed":            true,
		"environment.alerted":            true,
		"environment.error":              true,
		"belief.revised":                 true,
		"belief.conflict.detected":       true,
		"freshness.expired":              true,
		"freshness.window.changed":       true,
		"delegation.requested":           true,
		"delegation.accepted":            true,
		"delegation.rejected":            true,
		"delegation.handoff.completed":   true,
		"delegation.escalated":           true,
		"interruption.requested":         true,
		"interruption.acknowledged":      true,
		"interruption.saved":             true,
		"interruption.resumed":           true,
		"interruption.cancelled":         true,
		"compensation.requested":         true,
		"compensation.completed":         true,
		"provenance.attestation.added":   true,
		"provenance.attestation.revoked": true,
		"provenance.chain.truncated":     true,
		"state.snapshot.requested":       true,
		"state.snapshot.ready":           true,
		"state.delta.applied":            true,
		"state.invalidated":              true,
	}
	for k, v := range context.EventTypes {
		m[k] = v
	}
	return m
}()

// IsStandardEventType reports whether a type is supported by the legacy aep adapter.
func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}

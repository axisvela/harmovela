package state

var EventTypes = map[string]bool{
	"state.snapshot.requested": true,
	"state.snapshot.ready":     true,
	"state.delta.applied":      true,
	"state.invalidated":        true,
	"freshness.expired":        true,
	"freshness.window.changed": true,
}

// IsEventType reports whether the type belongs to the State dimension registry.
func IsEventType(typ string) bool {
	return EventTypes[typ]
}

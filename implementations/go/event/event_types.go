package event

var standardEventTypes = map[string]bool{
	"session.opened":         true,
	"session.ready":          true,
	"session.heartbeat":      true,
	"session.closed":         true,
	"session.error":          true,
	"capabilities.requested": true,
	"capabilities.declared":  true,
	"capabilities.changed":   true,
	"subscription.requested": true,
	"subscription.created":   true,
	"subscription.rejected":  true,
	"subscription.cancelled": true,
	"subscription.expired":   true,
	"event.acknowledged":     true,
	"event.rejected":         true,
}

// IsStandardEventType reports whether the type belongs to the Event core registry.
func IsStandardEventType(typ string) bool {
	return standardEventTypes[typ]
}

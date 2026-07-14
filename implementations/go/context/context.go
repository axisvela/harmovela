package context

var EventTypes = map[string]bool{
	"context.updated":             true,
	"context.invalidated":         true,
	"context.snapshot.requested":  true,
	"context.snapshot.ready":      true,
	"context.retrieval.started":   true,
	"context.retrieval.completed": true,
	"context.retrieval.failed":    true,
	"memory.fact.added":           true,
	"memory.fact.updated":         true,
	"memory.fact.invalidated":     true,
	"memory.episode.stored":       true,
	"memory.preference.updated":   true,
	"memory.constraint.updated":   true,
	"memory.summary.ready":        true,
	"memory.retrieval.ready":      true,
	"belief.revised":              true,
	"belief.conflict.detected":    true,
	"provenance.attestation.added": true,
	"provenance.attestation.revoked": true,
	"provenance.chain.truncated":  true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

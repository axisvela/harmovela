package delegation

var EventTypes = map[string]bool{
	"delegation.requested":         true,
	"delegation.accepted":          true,
	"delegation.rejected":          true,
	"delegation.handoff.completed": true,
	"delegation.escalated":         true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

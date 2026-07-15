package capability

var EventTypes = map[string]bool{
	"capability.registered": true,
	"capability.updated":    true,
	"capability.deprecated": true,
	"capability.composed":   true,
	"capability.validated":  true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

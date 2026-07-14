package recovery

var EventTypes = map[string]bool{
	"interruption.requested":    true,
	"interruption.acknowledged": true,
	"interruption.saved":        true,
	"interruption.resumed":      true,
	"interruption.cancelled":    true,
	"compensation.requested":    true,
	"compensation.completed":    true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

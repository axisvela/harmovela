package environment

var EventTypes = map[string]bool{
	"environment.observed": true,
	"environment.changed":  true,
	"environment.alerted":  true,
	"environment.error":    true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

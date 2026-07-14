package query

var EventTypes = map[string]bool{
	"query.requested": true,
	"query.response":  true,
	"query.rejected":  true,
	"query.error":     true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

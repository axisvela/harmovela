package agent

var EventTypes = map[string]bool{
	"agent.message.sent":      true,
	"agent.message.received":  true,
	"agent.message.failed":    true,
	"agent.request.created":   true,
	"agent.response.created":  true,
	"agent.decision.recorded": true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

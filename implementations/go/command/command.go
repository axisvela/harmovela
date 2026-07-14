package command

var EventTypes = map[string]bool{
	"command.requested": true,
	"command.accepted":  true,
	"command.rejected":  true,
	"command.completed": true,
	"command.failed":    true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

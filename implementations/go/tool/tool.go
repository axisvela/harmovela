package tool

var EventTypes = map[string]bool{
	"tool.call.requested":        true,
	"tool.call.accepted":         true,
	"tool.call.rejected":         true,
	"tool.call.started":          true,
	"tool.call.progress":         true,
	"tool.call.output":           true,
	"tool.call.completed":        true,
	"tool.call.failed":           true,
	"tool.call.cancel.requested": true,
	"tool.call.cancelled":        true,
	"tool.call.timed_out":        true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

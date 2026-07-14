package adaptation

var EventTypes = map[string]bool{
	"adaptation.outcome.correlated":    true,
	"adaptation.goal.created":          true,
	"adaptation.goal.updated":          true,
	"adaptation.goal.achieved":         true,
	"adaptation.goal.abandoned":        true,
	"adaptation.cost.exceeded":         true,
	"adaptation.budget.established":    true,
	"adaptation.budget.adjusted":       true,
	"adaptation.budget.limit_exceeded": true,
	"adaptation.budget.exhausted":      true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}

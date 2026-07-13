package aep

import "github.com/axisrobo/harmovela/event"

func MatchesType(pattern, value string) bool { return event.MatchesType(pattern, value) }

func SubscriptionMatches(filter map[string]any, value map[string]any) bool {
	return event.SubscriptionMatches(filter, value)
}

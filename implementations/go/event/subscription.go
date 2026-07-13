package event

import "strings"

func MatchesType(pattern, value string) bool {
	if pattern == "*" || pattern == value {
		return true
	}
	if strings.HasSuffix(pattern, ".*") {
		return strings.HasPrefix(value, pattern[:len(pattern)-1])
	}
	patternParts, valueParts := strings.Split(pattern, "."), strings.Split(value, ".")
	if len(patternParts) != len(valueParts) {
		return false
	}
	for index, part := range patternParts {
		if part != "*" && part != valueParts[index] {
			return false
		}
	}
	return true
}

func SubscriptionMatches(filter map[string]any, event map[string]any) bool {
	if types, ok := filter["types"]; ok && types != nil {
		typ, _ := event["type"].(string)
		if !matchesTypeValue(types, typ) {
			return false
		}
	}
	for _, field := range []string{"source", "target", "topic", "session_id", "conversation_id", "task_id"} {
		expected, ok := filter[field]
		if ok && expected != nil && !matchesValue(expected, event[field]) {
			return false
		}
	}
	return true
}

func matchesTypeValue(patterns any, value string) bool {
	switch patterns := patterns.(type) {
	case string:
		return MatchesType(patterns, value)
	case []any:
		for _, pattern := range patterns {
			if pattern, ok := pattern.(string); ok && MatchesType(pattern, value) {
				return true
			}
		}
	case []string:
		for _, pattern := range patterns {
			if MatchesType(pattern, value) {
				return true
			}
		}
	}
	return false
}

func matchesValue(expected, actual any) bool {
	switch expected := expected.(type) {
	case string:
		value, _ := actual.(string)
		return expected == value
	case []any:
		for _, value := range expected {
			if value == actual {
				return true
			}
		}
		return false
	case []string:
		value, _ := actual.(string)
		for _, expected := range expected {
			if expected == value {
				return true
			}
		}
		return false
	}
	return expected == actual
}

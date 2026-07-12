package aep

import "strings"

// MatchesType reports whether an event type matches a dotted subscription pattern.
// Supports "*" (any), a trailing ".*" prefix match, and per-segment "*" wildcards.
func MatchesType(pattern, value string) bool {
	if pattern == "*" || pattern == value {
		return true
	}
	if strings.HasSuffix(pattern, ".*") {
		prefix := pattern[:len(pattern)-1]
		return strings.HasPrefix(value, prefix)
	}
	patternParts := strings.Split(pattern, ".")
	valueParts := strings.Split(value, ".")
	if len(patternParts) != len(valueParts) {
		return false
	}
	for i, p := range patternParts {
		if p != "*" && p != valueParts[i] {
			return false
		}
	}
	return true
}

// SubscriptionMatches reports whether an event satisfies a subscription filter.
// The filter may contain "types" (a type pattern) and equality fields
// "source", "target", "topic", "session_id", "conversation_id", "task_id".
func SubscriptionMatches(filter map[string]any, event map[string]any) bool {
	if types, ok := filter["types"]; ok && types != nil {
		typ, _ := event["type"].(string)
		if !matchesTypeValue(types, typ) {
			return false
		}
	}
	for _, field := range []string{"source", "target", "topic", "session_id", "conversation_id", "task_id"} {
		expected, ok := filter[field]
		if !ok || expected == nil {
			continue
		}
		if !matchesValue(expected, event[field]) {
			return false
		}
	}
	return true
}

func matchesTypeValue(patterns any, value string) bool {
	switch p := patterns.(type) {
	case string:
		return MatchesType(p, value)
	case []any:
		for _, item := range p {
			if s, ok := item.(string); ok && MatchesType(s, value) {
				return true
			}
		}
		return false
	case []string:
		for _, s := range p {
			if MatchesType(s, value) {
				return true
			}
		}
		return false
	}
	return false
}

func matchesValue(expected any, actual any) bool {
	switch e := expected.(type) {
	case string:
		s, _ := actual.(string)
		return e == s
	case []any:
		for _, item := range e {
			if item == actual {
				return true
			}
		}
		return false
	case []string:
		s, _ := actual.(string)
		for _, item := range e {
			if item == s {
				return true
			}
		}
		return false
	}
	return expected == actual
}

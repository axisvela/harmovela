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

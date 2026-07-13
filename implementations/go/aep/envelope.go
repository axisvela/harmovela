package aep

import "github.com/axisrobo/harmovela/event"

// ValidateEnvelope delegates structural validation to Event while retaining the
// legacy aep registry for non-Event domains.
func ValidateEnvelope(value map[string]any) []string {
	if value == nil {
		return event.ValidateEnvelope(value)
	}
	typ, isString := value["type"].(string)
	if !isString || event.IsStandardEventType(typ) {
		return event.ValidateEnvelope(value)
	}

	adapted := make(map[string]any, len(value))
	for key, item := range value {
		adapted[key] = item
	}
	adapted["type"] = "event.acknowledged"
	errors := event.ValidateEnvelope(adapted)
	if !IsStandardEventType(typ) {
		errors = append(errors, "type is not in the standard draft registry: "+typ)
	}
	return errors
}

package aep

import (
	"time"
)

var deliveryModes = map[string]bool{
	"best_effort":   true,
	"at_least_once": true,
	"replayable":    true,
}

func ValidateEnvelope(value map[string]any) []string {
	var errors []string

	if value == nil {
		return []string{"event must be a JSON object"}
	}

	requireString(value, "aep_version", &errors)
	requireString(value, "id", &errors)
	requireString(value, "type", &errors)
	requireString(value, "source", &errors)
	requireString(value, "created_at", &errors)

	if _, ok := value["payload"]; !ok {
		errors = append(errors, "payload is required")
	}

	if typ, ok := value["type"].(string); ok && !IsStandardEventType(typ) {
		errors = append(errors, "type is not in the standard draft registry: "+typ)
	}

	if v, ok := value["aep_version"].(string); ok && v != "0.1" {
		errors = append(errors, "unsupported protocol version: "+v)
	}

	if ts, ok := value["created_at"].(string); ok {
		if _, err := time.Parse(time.RFC3339, ts); err != nil {
			errors = append(errors, "created_at must be an ISO-compatible timestamp")
		}
	}

	if delivery, ok := value["delivery"]; ok {
		validateDelivery(delivery, &errors)
	}

	if typ, _ := value["type"].(string); typ == "subscription.requested" {
		if payload, ok := value["payload"].(map[string]any); ok {
			validateSubscriptionPayload(payload, &errors)
		}
	}

	return errors
}

func requireString(value map[string]any, field string, errors *[]string) {
	s, ok := value[field].(string)
	if !ok || s == "" {
		*errors = append(*errors, field+" must be a non-empty string")
	}
}

func validateDelivery(delivery any, errors *[]string) {
	d, ok := delivery.(map[string]any)
	if !ok {
		*errors = append(*errors, "delivery must be an object when present")
		return
	}
	if mode, ok := d["mode"].(string); ok && !deliveryModes[mode] {
		*errors = append(*errors, "delivery.mode must be one of: best_effort, at_least_once, replayable")
	}
}

func validateSubscriptionPayload(payload map[string]any, errors *[]string) {
	if types, ok := payload["types"]; ok && !isStringOrSlice(types) {
		*errors = append(*errors, "subscription payload types must be a string or string array")
	}
	fields := []string{"source", "target", "topic", "session_id", "conversation_id", "task_id"}
	for _, f := range fields {
		if v, ok := payload[f]; ok && !isStringOrSlice(v) {
			*errors = append(*errors, "subscription payload "+f+" must be a string or string array")
		}
	}
}

func isStringOrSlice(v any) bool {
	if _, ok := v.(string); ok {
		return true
	}
	arr, ok := v.([]any)
	if !ok {
		return false
	}
	for _, item := range arr {
		if _, ok := item.(string); !ok {
			return false
		}
	}
	return true
}

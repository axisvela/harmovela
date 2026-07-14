package aep

import (
	"fmt"
	"time"

	"github.com/axisrobo/harmovela/recovery"
	"github.com/axisrobo/harmovela/event"
	"github.com/axisrobo/harmovela/governance"
	"github.com/axisrobo/harmovela/task"
)

type AuditRecord struct {
	ActorID        string
	TenantID       string
	Action         string
	TargetTenantID string
	Allowed        bool
	CorrelationID  string
	CausationID    string
}

type Harness struct {
	Source        string
	sequence      int
	subscriptions map[string]map[string]any
	tasks         map[string]*task.Tracker
	router        *event.EventRouter
	session       *event.HarmovelaSession
	Delivery      *recovery.DeliveryTracker
	Audit         []AuditRecord
}

func NewHarness() *Harness {
	h := &Harness{
		Source:        "harness:harmovela",
		subscriptions: make(map[string]map[string]any),
		tasks:         make(map[string]*task.Tracker),
		router:        event.NewEventRouter(),
		Delivery:      recovery.NewDeliveryTracker(nil, nil),
		Audit:         make([]AuditRecord, 0),
	}
	h.setupRouter()
	h.setupDeliveryRouter()
	return h
}

func (h *Harness) Session() *event.HarmovelaSession {
	return h.session
}

func (h *Harness) Subscriptions() map[string]map[string]any {
	return h.subscriptions
}

func (h *Harness) Tasks() map[string]*task.Tracker {
	return h.tasks
}

func (h *Harness) setupRouter() {
	h.router.
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "capabilities.requested"
		}, h.handleCapabilities).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "subscription.requested"
		}, h.handleSubscriptionRequested).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "subscription.cancelled"
		}, h.handleSubscriptionCancelled).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "task.submitted"
		}, h.handleTaskSubmitted).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "task.cancel.requested"
		}, h.handleTaskCancelRequested).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return len(typ) > 5 && typ[:5] == "task." && typ != "task.submitted" && typ != "task.cancel.requested"
		}, h.handleTaskEvent).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "session.opened"
		}, h.handleSessionOpened).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "session.closed"
		}, h.handleSessionClosed)
}

func (h *Harness) setupDeliveryRouter() {
	h.router.
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "event.acknowledged"
		}, h.handleInboundAck).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "event.redelivered"
		}, h.handleInboundRedeliver).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "event.dead_lettered"
		}, h.handleInboundDeadLetter)
}

func (h *Harness) Handle(value map[string]any) []map[string]any {
	errs := ValidateEnvelope(value)
	if len(errs) > 0 {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": errs,
			"error":  ErrorPayload(ErrorCodeInvalidEnvelope, errs[0], false),
		})}
	}

	typ, _ := value["type"].(string)
	if !IsStandardEventType(typ) && (len(typ) < 8 || typ[:8] != "session.") {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": []string{"type not in standard draft registry: " + typ},
			"error":  ErrorPayload(ErrorCodeInvalidEventType, "unknown event type: "+typ, false),
		})}
	}

	if v, _ := value["spec_version"].(string); v != "0.2" {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": []string{"unsupported protocol version: " + v},
			"error":  ErrorPayload(ErrorCodeUnsupportedVersion, "unsupported version "+v, false),
		})}
	}

	if actorID, hasActor := value["actor_id"].(string); hasActor && actorID != "" {
		if requestedAction, hasAction := value["requested_action"].(string); hasAction {
			roles := make([]string, 0)
			if rolesRaw, ok := value["roles"].([]any); ok {
				for _, r := range rolesRaw {
					if rs, ok := r.(string); ok {
						roles = append(roles, rs)
					}
				}
			}
			tenantID, _ := value["tenant_id"].(string)
			targetTenantID, _ := value["target_tenant_id"].(string)
			correlationID, _ := value["correlation_id"].(string)
			causationID, _ := value["causation_id"].(string)

			decision := governance.Authorize(governance.PolicyRequest{
				ActorID:      actorID,
				ActorTenant:  tenantID,
				Roles:        roles,
				Action:       requestedAction,
				TargetTenant: targetTenantID,
			})
			h.Audit = append(h.Audit, AuditRecord{
				ActorID:        actorID,
				TenantID:       tenantID,
				Action:         requestedAction,
				TargetTenantID: targetTenantID,
				Allowed:        decision.Allowed,
				CorrelationID:  correlationID,
				CausationID:    causationID,
			})
			if !decision.Allowed {
				return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
					"error": ErrorPayload(ErrorCodeUnauthorized, "governance denied: "+decision.Reason, false),
				})}
			}
		}
	}

	if delivery, ok := value["delivery"].(map[string]any); ok {
		if mode, _ := delivery["mode"].(string); mode != "" {
			eventID, _ := value["id"].(string)
			sessionID, _ := value["session_id"].(string)
			if sessionID == "" {
				sessionID = "_default"
			}
			h.Delivery.Track(eventID, sessionID)
		}
	}

	routed := h.router.Dispatch(value)
	if len(routed) > 0 {
		return routed
	}

	return []map[string]any{h.newEvent("event.acknowledged", value, map[string]any{
		"acknowledged_event_id": value["id"],
	})}
}

func (h *Harness) handleCapabilities(event map[string]any) any {
	return h.newEvent("capabilities.declared", event, map[string]any{
		"protocol":       "aep",
		"spec_version":   "0.2",
		"transports":     []string{"stdio"},
		"delivery_modes": []string{"best_effort", "at_least_once", "replayable"},
		"features": []string{
			"envelope_validation", "event_type_registry", "subscription_matching",
			"session_lifecycle", "task_lifecycle", "error_model", "event_routing",
		},
	})
}

func (h *Harness) handleSubscriptionRequested(event map[string]any) any {
	payload, _ := event["payload"].(map[string]any)
	if payload == nil {
		payload = map[string]any{}
	}

	subID := fmt.Sprintf("sub_%04d", h.nextSeq())

	hasFilter := payload["types"] != nil || payload["source"] != nil || payload["target"] != nil || payload["topic"] != nil
	if !hasFilter {
		return h.newEvent("subscription.rejected", event, map[string]any{
			"subscription_id": subID,
			"filter":          payload,
			"error":           ErrorPayload(ErrorCodeSubscriptionRejected, "subscription must include at least one filter criterion", false),
		})
	}

	h.subscriptions[subID] = map[string]any{
		"id":         subID,
		"filter":     payload,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}

	return h.newEvent("subscription.created", event, map[string]any{
		"subscription_id": subID,
		"filter":          payload,
	})
}

func (h *Harness) handleSubscriptionCancelled(event map[string]any) any {
	payload, _ := event["payload"].(map[string]any)
	if payload != nil {
		if subID, ok := payload["subscription_id"].(string); ok {
			delete(h.subscriptions, subID)
		}
	}
	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) handleTaskSubmitted(event map[string]any) any {
	taskID, _ := event["task_id"].(string)
	if taskID == "" {
		if payload, ok := event["payload"].(map[string]any); ok {
			taskID, _ = payload["task_id"].(string)
		}
	}
	if taskID == "" {
		taskID = fmt.Sprintf("task_%d", time.Now().UnixMilli())
	}

	if _, exists := h.tasks[taskID]; exists {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "duplicate task id: "+taskID, false),
		})
	}

	description := ""
	if payload, ok := event["payload"].(map[string]any); ok {
		description, _ = payload["description"].(string)
	}
	source, _ := event["source"].(string)
	tracker := task.NewTracker(taskID, source, description)
	tracker.Accept()
	h.tasks[taskID] = tracker

	return h.newEvent("task.accepted", event, map[string]any{
		"task_id": taskID,
		"status":  "accepted",
	})
}

func (h *Harness) handleTaskEvent(event map[string]any) any {
	taskID, _ := event["task_id"].(string)
	if taskID == "" {
		if payload, ok := event["payload"].(map[string]any); ok {
			taskID, _ = payload["task_id"].(string)
		}
	}
	if taskID == "" {
		return nil
	}

	tracker, ok := h.tasks[taskID]
	if !ok {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "unknown task: "+taskID, false),
		})
	}

	eventType, _ := event["type"].(string)
	payload, _ := event["payload"].(map[string]any)
	taskEvent := tracker.Transition(eventType, payload)
	if taskEvent == nil {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "illegal task transition: "+string(tracker.State)+" for task "+taskID, false),
		})
	}

	responses := []map[string]any{
		h.newEvent("event.acknowledged", event, map[string]any{
			"acknowledged_event_id": event["id"],
		}),
		taskEvent,
	}

	if tracker.IsTerminal() {
		delete(h.tasks, taskID)
	}

	return responses
}

func (h *Harness) handleTaskCancelRequested(event map[string]any) any {
	taskID, _ := event["task_id"].(string)
	if taskID == "" {
		if payload, ok := event["payload"].(map[string]any); ok {
			taskID, _ = payload["task_id"].(string)
		}
	}
	if taskID == "" {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "unknown task: missing", false),
		})
	}

	_, ok := h.tasks[taskID]
	if !ok {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "unknown task: "+taskID, false),
		})
	}

	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) handleSessionOpened(event map[string]any) any {
	if h.session != nil && h.session.IsActive() {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeSessionError, "session already active", false),
		})
	}

	sessionID, _ := event["session_id"].(string)
	h.session = NewHarmovelaSession(sessionID, h.Source, "0.2")
	opened, _ := h.session.Opened()

	ready := h.newEvent("session.ready", event, map[string]any{
		"session_id": sessionID,
		"capabilities": map[string]any{
			"protocol":     "aep",
			"spec_version": "0.2",
			"transports":   []string{"stdio"},
			"features":     []string{"envelope", "subscription", "task_lifecycle", "error_model"},
		},
	})

	return []map[string]any{opened, ready}
}

func (h *Harness) handleSessionClosed(event map[string]any) any {
	responses := []map[string]any{
		h.newEvent("event.acknowledged", event, map[string]any{
			"acknowledged_event_id": event["id"],
		}),
	}
	if h.session != nil && h.session.IsOpen() {
		closed, err := h.session.Close()
		if err == nil && closed != nil {
			responses = append(responses, closed)
		}
	}
	return responses
}

func (h *Harness) handleInboundAck(event map[string]any) any {
	if payload, ok := event["payload"].(map[string]any); ok {
		if eventID, ok := payload["acknowledged_event_id"].(string); ok && eventID != "" {
			h.Delivery.Ack(eventID)
		}
	}
	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) handleInboundRedeliver(event map[string]any) any {
	if payload, ok := event["payload"].(map[string]any); ok {
		if eventID, ok := payload["original_event_id"].(string); ok && eventID != "" {
			h.Delivery.Nack(eventID)
		}
	}
	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) handleInboundDeadLetter(event map[string]any) any {
	if payload, ok := event["payload"].(map[string]any); ok {
		if eventID, ok := payload["original_event_id"].(string); ok && eventID != "" {
			reason := map[string]any{"code": "unknown"}
			if err, ok := payload["error"].(map[string]any); ok {
				reason = err
			}
			h.Delivery.DeadLetter(eventID, reason)
		}
	}
	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) nextSeq() int {
	h.sequence++
	return h.sequence
}

func (h *Harness) newEvent(typ string, input map[string]any, payload map[string]any) map[string]any {
	seq := h.nextSeq()
	aepVer, _ := input["spec_version"].(string)
	if aepVer == "" {
		aepVer = "0.2"
	}
	source, _ := input["source"].(string)

	return map[string]any{
		"spec_version":    aepVer,
		"id":              fmt.Sprintf("evt_harness_%06d", seq),
		"type":            typ,
		"source":          h.Source,
		"target":          source,
		"topic":           input["topic"],
		"session_id":      input["session_id"],
		"conversation_id": input["conversation_id"],
		"task_id":         input["task_id"],
		"correlation_id":  input["correlation_id"],
		"causation_id":    input["id"],
		"created_at":      time.Now().UTC().Format(time.RFC3339),
		"delivery": map[string]any{
			"mode":     "best_effort",
			"sequence": seq,
		},
		"payload": payload,
	}
}

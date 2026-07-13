package com.axisrobo.aep;

import com.axisrobo.harmovela.event.router.EventRouter;
import com.axisrobo.harmovela.event.session.Session;
import com.axisrobo.harmovela.governance.GovernancePolicy;
import java.time.Instant;
import java.util.*;

public class Harness {

    private static final String SOURCE = "harness:harmovela";
    private int sequence;
    private final Map<String, Map<String, Object>> subscriptions = new LinkedHashMap<>();
    private final Map<String, TaskTracker> tasks = new LinkedHashMap<>();
    private final EventRouter router = new EventRouter();
    private final DeliveryTracker delivery;
    private final List<Map<String, Object>> audit = new ArrayList<>();
    private Session session;

    public Harness() {
        this.delivery = new DeliveryTracker();
        setupDeliveryRouter();
        router
            .on(e -> "capabilities.requested".equals(e.get("type")), this::handleCapabilities)
            .on(e -> "subscription.requested".equals(e.get("type")), this::handleSubscriptionRequested)
            .on(e -> "subscription.cancelled".equals(e.get("type")), this::handleSubscriptionCancelled)
            .on(e -> "task.submitted".equals(e.get("type")), this::handleTaskSubmitted)
            .on(e -> {
                var t = (String) e.get("type");
                return t != null && t.startsWith("task.") && !"task.submitted".equals(t);
            }, this::handleTaskEvent)
            .on(e -> "session.opened".equals(e.get("type")), this::handleSessionOpened)
            .on(e -> "session.closed".equals(e.get("type")), this::handleSessionClosed)
            .on(e -> "session.error".equals(e.get("type")), this::handleSessionError);
    }

    public Session getSession() { return session; }
    public Map<String, Map<String, Object>> getSubscriptions() { return subscriptions; }
    public Map<String, TaskTracker> getTasks() { return tasks; }
    public DeliveryTracker getDelivery() { return delivery; }
    public List<Map<String, Object>> getAudit() { return audit; }

    private void setupDeliveryRouter() {
        router
            .on(e -> "event.acknowledged".equals(e.get("type")), this::handleInboundAck)
            .on(e -> "event.redelivered".equals(e.get("type")), this::handleInboundRedeliver)
            .on(e -> "event.dead_lettered".equals(e.get("type")), this::handleInboundDeadLetter);
    }

    public List<Map<String, Object>> handle(Map<String, Object> value) {
        var errs = com.axisrobo.aep.Envelope.validate(value);
        if (!errs.isEmpty()) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", errs, "error", Errors.errorPayload(Errors.INVALID_ENVELOPE, errs.get(0), false)
            )));
        }

        var type = (String) value.get("type");
        if (!com.axisrobo.aep.EventTypes.isStandardEventType(type) && (type == null || !type.startsWith("session."))) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", List.of("type not in standard draft registry: " + type),
                "error", Errors.errorPayload(Errors.INVALID_EVENT_TYPE, "unknown event type: " + type, false)
            )));
        }

        if (!"0.2".equals(value.get("spec_version"))) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", List.of("unsupported protocol version: " + value.get("spec_version")),
                "error", Errors.errorPayload(Errors.UNSUPPORTED_VERSION, "unsupported version " + value.get("spec_version"), false)
            )));
        }

        var actorId = (String) value.get("actor_id");
        var requestedAction = (String) value.get("requested_action");
        if (actorId != null && requestedAction != null) {
            var tenantId = (String) value.get("tenant_id");
            var targetTenantId = (String) value.get("target_tenant_id");
            var correlationId = (String) value.get("correlation_id");
            var causationId = (String) value.get("causation_id");
            @SuppressWarnings("unchecked")
            var roles = (List<String>) value.getOrDefault("roles", List.of());

            var decision = GovernancePolicy.authorize(actorId, tenantId, roles, requestedAction, targetTenantId);
            var auditEntry = new LinkedHashMap<String, Object>();
            auditEntry.put("actor_id", actorId);
            auditEntry.put("tenant_id", tenantId);
            auditEntry.put("action", requestedAction);
            auditEntry.put("target_tenant_id", targetTenantId);
            auditEntry.put("allowed", decision.allowed());
            auditEntry.put("correlation_id", correlationId);
            auditEntry.put("causation_id", causationId);
            audit.add(auditEntry);

            if (!decision.allowed()) {
                return List.of(newEvent("event.rejected", value, Map.of(
                    "error", Errors.errorPayload(Errors.UNAUTHORIZED, "governance denied: " + decision.reason(), false)
                )));
            }
        }

        var deliveryMeta = value.get("delivery");
        if (deliveryMeta instanceof Map<?,?> dm && dm.get("mode") instanceof String mode && !mode.isEmpty()) {
            var eventId = (String) value.get("id");
            var sessionId = (String) value.getOrDefault("session_id", "_default");
            delivery.track(eventId, sessionId);
        }

        var routed = router.dispatch(value);
        if (!routed.isEmpty()) return routed;

        return List.of(newEvent("event.acknowledged", value, Map.of("acknowledged_event_id", value.get("id"))));
    }

    private Object handleCapabilities(Map<String, Object> event) {
        return newEvent("capabilities.declared", event, Map.of(
            "protocol", "harmovela", "spec_version", "0.2",
            "transports", List.of("stdio"),
            "delivery_modes", List.of("best_effort", "at_least_once", "replayable"),
            "features", List.of("envelope_validation", "event_type_registry", "subscription_matching",
                "session_lifecycle", "task_lifecycle", "error_model", "event_routing")
        ));
    }

    @SuppressWarnings("unchecked")
    private Object handleSubscriptionRequested(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.getOrDefault("payload", Map.of());
        var subId = "sub_" + String.format("%04d", nextSeq());

        var hasFilter = payload.containsKey("types") || payload.containsKey("source")
            || payload.containsKey("target") || payload.containsKey("topic");
        if (!hasFilter) {
            return newEvent("subscription.rejected", event, Map.of(
                "subscription_id", subId, "filter", payload,
                "error", Errors.errorPayload(Errors.SUBSCRIPTION_REJECTED, "subscription must include at least one filter criterion", false)
            ));
        }

        subscriptions.put(subId, Map.of("id", subId, "filter", payload, "created_at", Instant.now().toString()));
        return newEvent("subscription.created", event, Map.of("subscription_id", subId, "filter", payload));
    }

    @SuppressWarnings("unchecked")
    private Object handleSubscriptionCancelled(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.get("payload");
        if (payload != null && payload.get("subscription_id") instanceof String subId) {
            subscriptions.remove(subId);
        }
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    @SuppressWarnings("unchecked")
    private Object handleTaskSubmitted(Map<String, Object> event) {
        var taskId = (String) event.getOrDefault("task_id", null);
        if (taskId == null && event.get("payload") instanceof Map<?, ?> p) {
            taskId = (String) p.get("task_id");
        }
        if (taskId == null) taskId = "task_" + System.currentTimeMillis();

        if (tasks.containsKey(taskId)) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "duplicate task id: " + taskId, false)
            ));
        }

        var source = (String) event.getOrDefault("source", "unknown");
        var tracker = new TaskTracker(taskId, source);
        tracker.accept();
        tasks.put(taskId, tracker);

        return newEvent("task.accepted", event, Map.of("task_id", taskId, "status", "accepted"));
    }

    @SuppressWarnings("unchecked")
    private Object handleTaskEvent(Map<String, Object> event) {
        var taskId = (String) event.getOrDefault("task_id", null);
        if (taskId == null && event.get("payload") instanceof Map<?, ?> p) {
            taskId = (String) p.get("task_id");
        }
        if (taskId == null) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "task event missing task_id", false)
            ));
        }

        var tracker = tasks.get(taskId);
        if (tracker == null) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "unknown task: " + taskId, false)
            ));
        }

        var eventType = (String) event.get("type");
        var payload = event.get("payload") instanceof Map<?, ?> p ? (Map<String, Object>) p : null;
        var taskEvent = tracker.transition(eventType, payload);
        if (taskEvent == null) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "illegal task transition: " + tracker.getState() + " for task " + taskId, false)
            ));
        }

        var responses = new ArrayList<>(List.of(newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")))));
        responses.add(taskEvent);

        if (tracker.isTerminal()) tasks.remove(taskId);
        return responses;
    }

    private Object handleSessionOpened(Map<String, Object> event) {
        if (session != null && session.isActive()) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.SESSION_ERROR, "session already active", false)
            ));
        }
        var sessionId = (String) event.getOrDefault("session_id", null);
        session = new Session(sessionId, SOURCE, "0.2");
        var opened = session.opened();

        var ready = Map.<String, Object>of(
            "spec_version", "0.2",
            "id", "evt_sess_ready_" + System.currentTimeMillis(),
            "type", "session.ready",
            "source", SOURCE,
            "session_id", session.getId(),
            "created_at", Instant.now().toString(),
            "payload", Map.of("session_id", session.getId(),
                "capabilities", Map.of("protocol", "harmovela", "spec_version", "0.2",
                    "transports", List.of("stdio"),
                    "features", List.of("envelope", "subscription", "task_lifecycle", "error_model")))
        );

        return List.of(opened, ready);
    }

    private Object handleSessionClosed(Map<String, Object> event) {
        var responses = new ArrayList<>(List.of(newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")))));
        if (session != null && session.isOpen()) {
            var closed = session.close();
            if (closed != null) responses.add(closed);
        }
        return responses;
    }

    private Object handleSessionError(Map<String, Object> event) {
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    @SuppressWarnings("unchecked")
    private Object handleInboundAck(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.get("payload");
        if (payload != null) {
            var eventId = (String) payload.get("acknowledged_event_id");
            if (eventId != null) delivery.ack(eventId);
        }
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    @SuppressWarnings("unchecked")
    private Object handleInboundRedeliver(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.get("payload");
        if (payload != null) {
            var eventId = (String) payload.get("original_event_id");
            if (eventId != null) delivery.nack(eventId);
        }
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    @SuppressWarnings("unchecked")
    private Object handleInboundDeadLetter(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.get("payload");
        if (payload != null) {
            var eventId = (String) payload.get("original_event_id");
            if (eventId != null) {
                var reason = new HashMap<String, Object>();
                reason.put("code", "unknown");
                if (payload.get("error") instanceof Map<?,?> err) {
                    reason.putAll((Map<String, Object>) err);
                }
                delivery.deadLetter(eventId, reason);
            }
        }
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    private int nextSeq() { return ++sequence; }

    private Map<String, Object> newEvent(String type, Map<String, Object> input, Map<String, Object> payload) {
        var seq = nextSeq();
        var map = new LinkedHashMap<String, Object>();
        map.put("spec_version", input.getOrDefault("spec_version", "0.2"));
        map.put("id", "evt_harness_" + String.format("%06d", seq));
        map.put("type", type);
        map.put("source", SOURCE);
        putIfNotNull(map, "target", input.get("source"));
        putIfNotNull(map, "session_id", input.get("session_id"));
        putIfNotNull(map, "task_id", input.get("task_id"));
        putIfNotNull(map, "causation_id", input.get("id"));
        map.put("created_at", Instant.now().toString());
        map.put("delivery", Map.of("mode", "best_effort", "sequence", seq));
        map.put("payload", payload);
        return map;
    }

    private static void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}

package com.axisrobo.harmovela.event.envelope;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Envelope {
    private Envelope() {}

    private static final Set<String> DELIVERY_MODES = Set.of("best_effort", "at_least_once", "replayable");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_DATE_TIME;

    public static final Set<String> STANDARD_TYPES = Set.of(
        "session.opened", "session.ready", "session.heartbeat", "session.closed", "session.error",
        "capabilities.requested", "capabilities.declared", "capabilities.changed",
        "subscription.requested", "subscription.created", "subscription.rejected",
        "subscription.cancelled", "subscription.expired",
        "event.acknowledged", "event.rejected", "event.redelivered", "event.dead_lettered",
        "task.submitted", "task.accepted", "task.started", "task.progress", "task.blocked",
        "task.output", "task.completed", "task.failed", "task.cancelled", "task.timed_out",
        "task.cancel.requested",
        "memory.updated", "memory.fact.added", "memory.fact.updated", "memory.fact.invalidated",
        "memory.episode.stored", "memory.preference.updated", "memory.constraint.updated",
        "memory.summary.ready", "memory.retrieval.ready",
        "context.updated", "context.invalidated",
        "context.snapshot.requested", "context.snapshot.ready",
        "context.retrieval.started", "context.retrieval.completed", "context.retrieval.failed",
        "belief.revised", "belief.conflict.detected",
        "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
        "interruption.requested", "interruption.acknowledged", "interruption.saved",
        "interruption.resumed", "interruption.cancelled",
        "compensation.requested", "compensation.completed",
        "freshness.expired",
        "delegation.requested", "delegation.accepted", "delegation.rejected",
        "delegation.escalated", "delegation.handoff.completed",
        "adaptation.outcome.correlated",
        "adaptation.goal.created", "adaptation.goal.updated",
        "adaptation.goal.achieved", "adaptation.goal.abandoned",
        "adaptation.cost.exceeded",
        "adaptation.budget.established", "adaptation.budget.adjusted",
        "adaptation.budget.limit_exceeded", "adaptation.budget.exhausted",
        "command.requested", "command.accepted", "command.rejected",
        "command.completed", "command.failed",
        "query.requested", "query.response", "query.rejected",
        "query.error",
        "capability.registered", "capability.updated", "capability.deprecated",
        "capability.composed", "capability.validated"
    );

    public static boolean isStandardEventType(String type) {
        return type != null && STANDARD_TYPES.contains(type);
    }

    public static List<String> validate(Map<String, Object> value) {
        var errors = new ArrayList<String>();
        if (value == null) return List.of("event must be a JSON object");

        requireString(value, "spec_version", errors);
        requireString(value, "id", errors);
        requireString(value, "type", errors);
        requireString(value, "source", errors);
        requireString(value, "created_at", errors);
        if (!value.containsKey("payload")) errors.add("payload is required");

        var type = (String) value.get("type");
        if (type != null && !isStandardEventType(type)) {
            errors.add("type is not in the standard draft registry: " + type);
        }
        var version = (String) value.get("spec_version");
        if (version != null && !"0.2".equals(version)) errors.add("unsupported protocol version: " + version);

        var ts = (String) value.get("created_at");
        if (ts != null) {
            try {
                ISO.parse(ts);
            } catch (DateTimeParseException e) {
                errors.add("created_at must be an ISO-compatible timestamp");
            }
        }
        if (value.containsKey("delivery")) validateDelivery(value.get("delivery"), errors);
        if ("subscription.requested".equals(type) && value.get("payload") instanceof Map<?, ?> payload) {
            validateSubscriptionPayload(payload, errors);
        }
        return errors;
    }

    private static void validateSubscriptionPayload(Map<?, ?> payload, List<String> errors) {
        if (payload.containsKey("types") && !isStringOrList(payload.get("types"))) {
            errors.add("subscription payload types must be a string or string array");
        }
        for (var field : List.of("source", "target", "topic", "session_id", "conversation_id", "task_id")) {
            if (payload.containsKey(field) && !isStringOrList(payload.get(field))) {
                errors.add("subscription payload " + field + " must be a string or string array");
            }
        }
    }

    private static void validateDelivery(Object delivery, List<String> errors) {
        if (!(delivery instanceof Map<?, ?> values)) {
            errors.add("delivery must be an object when present");
            return;
        }
        var mode = values.get("mode");
        if (mode instanceof String value && !DELIVERY_MODES.contains(value)) {
            errors.add("delivery.mode must be one of: best_effort, at_least_once, replayable");
        }
    }

    private static void requireString(Map<String, Object> value, String field, List<String> errors) {
        var fieldValue = value.get(field);
        if (!(fieldValue instanceof String string) || string.isEmpty()) {
            errors.add(field + " must be a non-empty string");
        }
    }

    private static boolean isStringOrList(Object value) {
        if (value instanceof String) return true;
        return value instanceof List<?> list && list.stream().allMatch(item -> item instanceof String);
    }
}

package com.axisrobo.harmovela.governance;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class GovernancePolicy {
    private static final Map<String, Set<String>> ROLE_ACTIONS = Map.of(
        "viewer", Set.of("event.subscribe"),
        "publisher", Set.of("event.publish", "task.submit"),
        "operator", Set.of("event.publish", "event.subscribe", "task.submit", "task.manage"),
        "tenant-admin", Set.of("event.publish", "event.subscribe", "task.submit", "task.manage", "governance.audit.read"),
        "cross-tenant-operator", Set.of("event.publish", "event.subscribe", "task.submit", "task.manage", "tenant.cross_access")
    );

    private GovernancePolicy() {}

    public record Decision(boolean allowed, String action, String reason, String actorTenant, String targetTenant) {}

    public static Decision authorize(String actorId, String actorTenant, List<String> roles, String action, String targetTenant) {
        if (actorId == null || actorId.isBlank()) return decision(false, action, "missing_identity", actorTenant, targetTenant);
        if (actorTenant == null || actorTenant.isBlank() || targetTenant == null || targetTenant.isBlank()) {
            return decision(false, action, "missing_tenant", actorTenant, targetTenant);
        }

        var actions = roles == null ? Set.<String>of() : roles.stream()
            .flatMap(role -> ROLE_ACTIONS.getOrDefault(role, Set.of()).stream())
            .collect(java.util.stream.Collectors.toSet());
        if (!actions.contains(action)) return decision(false, action, "missing_role", actorTenant, targetTenant);
        if (!actorTenant.equals(targetTenant) && !actions.contains("tenant.cross_access")) {
            return decision(false, action, "tenant_access_denied", actorTenant, targetTenant);
        }
        return decision(true, action, "allowed", actorTenant, targetTenant);
    }

    private static Decision decision(boolean allowed, String action, String reason, String actorTenant, String targetTenant) {
        return new Decision(allowed, action, reason, actorTenant, targetTenant);
    }
}

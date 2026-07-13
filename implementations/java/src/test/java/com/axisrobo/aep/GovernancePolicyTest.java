package com.axisrobo.aep;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GovernancePolicyTest {
    @Test
    void grantsStandardActionsToApprovedRoles() {
        for (var testCase : List.of(
            new TestCase(List.of("viewer"), "event.subscribe"),
            new TestCase(List.of("publisher"), "event.publish"),
            new TestCase(List.of("publisher"), "task.submit"),
            new TestCase(List.of("operator"), "task.manage"),
            new TestCase(List.of("tenant-admin"), "governance.audit.read"),
            new TestCase(List.of("cross-tenant-operator"), "tenant.cross_access")
        )) {
            assertEquals(
                new GovernancePolicy.Decision(true, testCase.action(), "allowed", "tenant-a", "tenant-a"),
                GovernancePolicy.authorize("agent-1", "tenant-a", testCase.roles(), testCase.action(), "tenant-a")
            );
        }
    }

    @Test
    void deniesActionWithoutAnApprovedRole() {
        assertEquals(
            new GovernancePolicy.Decision(false, "event.publish", "missing_role", "tenant-a", "tenant-a"),
            GovernancePolicy.authorize("agent-1", "tenant-a", List.of("viewer"), "event.publish", "tenant-a")
        );
    }

    @Test
    void deniesRequestsMissingActorIdentityOrTenantContext() {
        var missingIdentity = GovernancePolicy.authorize(null, "tenant-a", List.of("publisher"), "event.publish", "tenant-a");
        var missingTenant = GovernancePolicy.authorize("agent-1", "tenant-a", List.of("publisher"), "event.publish", null);

        assertEquals("missing_identity", missingIdentity.reason());
        assertEquals("missing_tenant", missingTenant.reason());
    }

    @Test
    void deniesCrossTenantActionsWithoutCrossTenantAccess() {
        var denied = GovernancePolicy.authorize("agent-1", "tenant-a", List.of("operator"), "event.publish", "tenant-b");
        var allowed = GovernancePolicy.authorize("agent-1", "tenant-a", List.of("cross-tenant-operator"), "event.publish", "tenant-b");

        assertFalse(denied.allowed());
        assertEquals("tenant_access_denied", denied.reason());
        assertEquals(
            new GovernancePolicy.Decision(true, "event.publish", "allowed", "tenant-a", "tenant-b"),
            allowed
        );
    }

    private record TestCase(List<String> roles, String action) {}
}

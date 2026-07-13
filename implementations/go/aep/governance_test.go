package aep

import "testing"

func TestAuthorizeGrantsStandardActionsToApprovedRoles(t *testing.T) {
	for _, tc := range []struct {
		roles  []string
		action string
	}{
		{[]string{"viewer"}, "event.subscribe"},
		{[]string{"publisher"}, "event.publish"},
		{[]string{"publisher"}, "task.submit"},
		{[]string{"operator"}, "task.manage"},
		{[]string{"tenant-admin"}, "governance.audit.read"},
		{[]string{"cross-tenant-operator"}, "tenant.cross_access"},
	} {
		decision := Authorize(PolicyRequest{ActorID: "agent-1", ActorTenant: "tenant-a", Roles: tc.roles, Action: tc.action, TargetTenant: "tenant-a"})
		if decision != (PolicyDecision{Allowed: true, Action: tc.action, Reason: "allowed", ActorTenant: "tenant-a", TargetTenant: "tenant-a"}) {
			t.Fatalf("unexpected decision for %s: %#v", tc.action, decision)
		}
	}
}

func TestAuthorizeDeniesActionWithoutApprovedRole(t *testing.T) {
	decision := Authorize(PolicyRequest{ActorID: "agent-1", ActorTenant: "tenant-a", Roles: []string{"viewer"}, Action: "event.publish", TargetTenant: "tenant-a"})
	want := PolicyDecision{Allowed: false, Action: "event.publish", Reason: "missing_role", ActorTenant: "tenant-a", TargetTenant: "tenant-a"}
	if decision != want {
		t.Fatalf("got %#v, want %#v", decision, want)
	}
}

func TestAuthorizeDeniesRequestsMissingActorIdentityOrTenantContext(t *testing.T) {
	missingIdentity := Authorize(PolicyRequest{ActorTenant: "tenant-a", Roles: []string{"publisher"}, Action: "event.publish", TargetTenant: "tenant-a"})
	missingTenant := Authorize(PolicyRequest{ActorID: "agent-1", ActorTenant: "tenant-a", Roles: []string{"publisher"}, Action: "event.publish"})
	if missingIdentity.Reason != "missing_identity" {
		t.Fatalf("expected missing identity denial, got %#v", missingIdentity)
	}
	if missingTenant.Reason != "missing_tenant" {
		t.Fatalf("expected missing tenant denial, got %#v", missingTenant)
	}
}

func TestAuthorizeDeniesCrossTenantActionsWithoutCrossTenantAccess(t *testing.T) {
	denied := Authorize(PolicyRequest{ActorID: "agent-1", ActorTenant: "tenant-a", Roles: []string{"operator"}, Action: "event.publish", TargetTenant: "tenant-b"})
	allowed := Authorize(PolicyRequest{ActorID: "agent-1", ActorTenant: "tenant-a", Roles: []string{"cross-tenant-operator"}, Action: "event.publish", TargetTenant: "tenant-b"})
	if denied.Allowed || denied.Reason != "tenant_access_denied" {
		t.Fatalf("expected cross-tenant denial, got %#v", denied)
	}
	want := PolicyDecision{Allowed: true, Action: "event.publish", Reason: "allowed", ActorTenant: "tenant-a", TargetTenant: "tenant-b"}
	if allowed != want {
		t.Fatalf("got %#v, want %#v", allowed, want)
	}
}

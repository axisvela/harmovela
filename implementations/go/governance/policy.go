package governance

var roleActions = map[string]map[string]bool{
	"viewer":                {"event.subscribe": true},
	"publisher":             {"event.publish": true, "task.submit": true},
	"operator":              {"event.publish": true, "event.subscribe": true, "task.submit": true, "task.manage": true},
	"tenant-admin":          {"event.publish": true, "event.subscribe": true, "task.submit": true, "task.manage": true, "governance.audit.read": true},
	"cross-tenant-operator": {"event.publish": true, "event.subscribe": true, "task.submit": true, "task.manage": true, "tenant.cross_access": true},
}

type PolicyRequest struct {
	ActorID      string
	ActorTenant  string
	Roles        []string
	Action       string
	TargetTenant string
}

type PolicyDecision struct {
	Allowed      bool
	Action       string
	Reason       string
	ActorTenant  string
	TargetTenant string
}

func Authorize(request PolicyRequest) PolicyDecision {
	decision := func(allowed bool, reason string) PolicyDecision {
		return PolicyDecision{Allowed: allowed, Action: request.Action, Reason: reason, ActorTenant: request.ActorTenant, TargetTenant: request.TargetTenant}
	}
	if request.ActorID == "" {
		return decision(false, "missing_identity")
	}
	if request.ActorTenant == "" || request.TargetTenant == "" {
		return decision(false, "missing_tenant")
	}

	actions := map[string]bool{}
	for _, role := range request.Roles {
		for action := range roleActions[role] {
			actions[action] = true
		}
	}
	if !actions[request.Action] {
		return decision(false, "missing_role")
	}
	if request.ActorTenant != request.TargetTenant && !actions["tenant.cross_access"] {
		return decision(false, "tenant_access_denied")
	}
	return decision(true, "allowed")
}

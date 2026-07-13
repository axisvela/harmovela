ROLE_ACTIONS = {
    "viewer": {"event.subscribe"},
    "publisher": {"event.publish", "task.submit"},
    "operator": {"event.publish", "event.subscribe", "task.submit", "task.manage"},
    "tenant-admin": {"event.publish", "event.subscribe", "task.submit", "task.manage", "governance.audit.read"},
    "cross-tenant-operator": {"event.publish", "event.subscribe", "task.submit", "task.manage", "tenant.cross_access"},
}


def authorize(actor: dict | None, action: str, target_tenant: str | None) -> dict:
    actor_tenant = actor.get("tenant_id") if actor else None

    def decision(allowed: bool, reason: str) -> dict:
        return {
            "allowed": allowed,
            "action": action,
            "reason": reason,
            "actorTenant": actor_tenant,
            "targetTenant": target_tenant,
        }

    if not actor or not actor.get("actor_id"):
        return decision(False, "missing_identity")
    if not actor_tenant or not target_tenant:
        return decision(False, "missing_tenant")

    actions = set().union(*(ROLE_ACTIONS.get(role, set()) for role in actor.get("roles", [])))
    if action not in actions:
        return decision(False, "missing_role")
    if actor_tenant != target_tenant and "tenant.cross_access" not in actions:
        return decision(False, "tenant_access_denied")
    return decision(True, "allowed")

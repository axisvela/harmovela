const ROLE_ACTIONS = {
  viewer: ["event.subscribe"],
  publisher: ["event.publish", "task.submit"],
  operator: ["event.publish", "event.subscribe", "task.submit", "task.manage"],
  "tenant-admin": ["event.publish", "event.subscribe", "task.submit", "task.manage", "governance.audit.read"],
  "cross-tenant-operator": ["event.publish", "event.subscribe", "task.submit", "task.manage", "tenant.cross_access"]
};

export function authorize({ actor, action, targetTenant }) {
  const actorTenant = actor?.tenantId ?? null;
  const decision = (allowed, reason) => ({ allowed, action, reason, actorTenant, targetTenant: targetTenant ?? null });

  if (!actor?.actorId) return decision(false, "missing_identity");
  if (!actorTenant || !targetTenant) return decision(false, "missing_tenant");

  const actions = actor.roles?.flatMap((role) => ROLE_ACTIONS[role] ?? []) ?? [];
  if (!actions.includes(action)) return decision(false, "missing_role");
  if (actorTenant !== targetTenant && !actions.includes("tenant.cross_access")) {
    return decision(false, "tenant_access_denied");
  }
  return decision(true, "allowed");
}

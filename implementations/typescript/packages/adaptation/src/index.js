export const ADAPTATION_EVENT_TYPES = new Set([
  "adaptation.outcome.correlated",
  "adaptation.goal.created",
  "adaptation.goal.updated",
  "adaptation.goal.achieved",
  "adaptation.goal.abandoned",
  "adaptation.cost.exceeded",
  "adaptation.budget.established",
  "adaptation.budget.adjusted",
  "adaptation.budget.limit_exceeded",
  "adaptation.budget.exhausted",
]);

export function isAdaptationEventType(type) {
  return ADAPTATION_EVENT_TYPES.has(type);
}

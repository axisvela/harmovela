export function subscriptionMatches(subscription, event) {
  const filter = subscription?.payload ?? subscription ?? {};

  return matchesType(filter.types, event.type)
    && matchesValue(filter.source, event.source)
    && matchesValue(filter.target, event.target)
    && matchesValue(filter.topic, event.topic)
    && matchesValue(filter.session_id, event.session_id)
    && matchesValue(filter.conversation_id, event.conversation_id)
    && matchesValue(filter.task_id, event.task_id);
}

export function matchesType(patterns, type) {
  if (patterns === undefined) return true;
  return toArray(patterns).some((pattern) => matchDottedPattern(pattern, type));
}

function matchesValue(expected, actual) {
  if (expected === undefined) return true;
  return toArray(expected).includes(actual);
}

function matchDottedPattern(pattern, value) {
  if (pattern === "*" || pattern === value) return true;
  if (pattern.endsWith(".*")) return value.startsWith(pattern.slice(0, -1));

  const patternParts = pattern.split(".");
  const valueParts = value.split(".");
  if (patternParts.length !== valueParts.length) return false;

  return patternParts.every((part, index) => part === "*" || part === valueParts[index]);
}

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

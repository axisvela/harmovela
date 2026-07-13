import { matchesType } from "./subscription.js";

export class EventRouter {
  constructor() {
    this._handlers = [];
  }

  on(patternsOrHandler, handler) {
    if (handler === undefined) {
      this._handlers.push({ match: () => true, handler: patternsOrHandler });
    } else if (typeof patternsOrHandler === "function") {
      this._handlers.push({ match: patternsOrHandler, handler });
    } else {
      const patterns = Array.isArray(patternsOrHandler) ? patternsOrHandler : [patternsOrHandler];
      this._handlers.push({ match: (event) => patterns.some((pattern) => matchesType(pattern, event.type)), handler });
    }
    return this;
  }

  dispatch(event) {
    const results = [];
    for (const { match, handler } of this._handlers) {
      if (!match(event)) continue;
      const responseOrResponses = handler(event);
      if (responseOrResponses !== undefined && responseOrResponses !== null) {
        results.push(...(Array.isArray(responseOrResponses) ? responseOrResponses : [responseOrResponses]));
      }
    }
    return results;
  }

  static pattern(pattern) {
    return { forSession: (sessionId) => (event) => matchesType(pattern, event.type) && event.session_id === sessionId };
  }
}

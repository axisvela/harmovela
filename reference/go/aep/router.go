package aep

// EventHandler is a function that processes an AEP event and returns zero or more response events.
type EventHandler func(event map[string]any) any

// MatchFunc determines whether a handler should process a given event.
type MatchFunc func(event map[string]any) bool

type handlerEntry struct {
	match   MatchFunc
	handler EventHandler
}

// EventRouter dispatches AEP events to registered handlers.
//
// Handlers are registered with On (conditionally matched) or OnAll (unconditionally matched).
// Dispatch evaluates each handler against the incoming event and collects any responses.
type EventRouter struct {
	handlers []handlerEntry
}

// NewEventRouter creates a new EventRouter with no registered handlers.
func NewEventRouter() *EventRouter {
	return &EventRouter{}
}

// On registers a handler that is invoked only when match returns true for the event.
func (r *EventRouter) On(match MatchFunc, handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{match: match, handler: handler})
	return r
}

// OnAll registers a handler that is invoked for every event dispatched.
func (r *EventRouter) OnAll(handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{
		match:   func(event map[string]any) bool { return true },
		handler: handler,
	})
	return r
}

// Dispatch sends an event to all matching handlers and collects their responses.
//
// Handlers may return a single event (map[string]any), a slice of events
// ([]map[string]any or []any of maps), or nil for no response.
func (r *EventRouter) Dispatch(event map[string]any) []map[string]any {
	var results []map[string]any
	for _, entry := range r.handlers {
		if entry.match(event) {
			response := entry.handler(event)
			if response == nil {
				continue
			}
			switch v := response.(type) {
			case []map[string]any:
				results = append(results, v...)
			case map[string]any:
				results = append(results, v)
			case []any:
				for _, item := range v {
					if m, ok := item.(map[string]any); ok {
						results = append(results, m)
					}
				}
			}
		}
	}
	return results
}

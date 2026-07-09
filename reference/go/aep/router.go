package aep

type EventHandler func(event map[string]any) any
type MatchFunc func(event map[string]any) bool

type handlerEntry struct {
	match   MatchFunc
	handler EventHandler
}

type EventRouter struct {
	handlers []handlerEntry
}

func NewEventRouter() *EventRouter {
	return &EventRouter{}
}

func (r *EventRouter) On(match MatchFunc, handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{match: match, handler: handler})
	return r
}

func (r *EventRouter) OnAll(handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{
		match:   func(event map[string]any) bool { return true },
		handler: handler,
	})
	return r
}

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

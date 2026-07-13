package event

type EventHandler func(event map[string]any) any
type MatchFunc func(event map[string]any) bool

type handlerEntry struct {
	match   MatchFunc
	handler EventHandler
}

type EventRouter struct{ handlers []handlerEntry }

func NewEventRouter() *EventRouter { return &EventRouter{} }

func (r *EventRouter) On(match MatchFunc, handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{match: match, handler: handler})
	return r
}

func (r *EventRouter) OnAll(handler EventHandler) *EventRouter {
	return r.On(func(map[string]any) bool { return true }, handler)
}

func (r *EventRouter) Dispatch(event map[string]any) []map[string]any {
	var results []map[string]any
	for _, entry := range r.handlers {
		if !entry.match(event) {
			continue
		}
		switch response := entry.handler(event).(type) {
		case []map[string]any:
			results = append(results, response...)
		case map[string]any:
			results = append(results, response)
		case []any:
			for _, item := range response {
				if result, ok := item.(map[string]any); ok {
					results = append(results, result)
				}
			}
		}
	}
	return results
}

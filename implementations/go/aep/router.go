package aep

import "github.com/axisrobo/harmovela/event"

type EventHandler = event.EventHandler
type MatchFunc = event.MatchFunc
type EventRouter = event.EventRouter

func NewEventRouter() *EventRouter { return event.NewEventRouter() }

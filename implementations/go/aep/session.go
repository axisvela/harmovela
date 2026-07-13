package aep

import "github.com/axisrobo/harmovela/event"

type SessionState = event.SessionState
type HarmovelaSession = event.HarmovelaSession

const (
	StateCreated = event.StateCreated
	StateOpened  = event.StateOpened
	StateReady   = event.StateReady
	StateClosed  = event.StateClosed
	StateError   = event.StateError
)

func NewHarmovelaSession(id, source, version string) *HarmovelaSession {
	return event.NewHarmovelaSession(id, source, version)
}

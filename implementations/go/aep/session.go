package aep

import (
	"errors"
	"fmt"
	"time"
)

type SessionState string

const (
	StateCreated SessionState = "created"
	StateOpened  SessionState = "opened"
	StateReady   SessionState = "ready"
	StateClosed  SessionState = "closed"
	StateError   SessionState = "error"
)

var validTransitions = map[SessionState][]SessionState{
	StateCreated: {StateOpened, StateError, StateClosed},
	StateOpened:  {StateReady, StateError, StateClosed},
	StateReady:   {StateError, StateClosed},
	StateClosed:  {},
	StateError:   {},
}

type HarmovelaSession struct {
	ID      string
	Source  string
	Version string
	State   SessionState
	eventID int
}

func NewHarmovelaSession(id, source, version string) *HarmovelaSession {
	if id == "" {
		id = fmt.Sprintf("sess_%d", time.Now().UnixMilli())
	}
	if source == "" {
		source = "harmovela:session"
	}
	if version == "" {
		version = "0.2"
	}
	return &HarmovelaSession{
		ID:      id,
		Source:  source,
		Version: version,
		State:   StateCreated,
	}
}

func (s *HarmovelaSession) nextEventID() string {
	s.eventID++
	return fmt.Sprintf("evt_sess_%06d", s.eventID)
}

func (s *HarmovelaSession) IsActive() bool {
	return s.State == StateOpened || s.State == StateReady
}

func (s *HarmovelaSession) IsOpen() bool {
	return s.State == StateOpened
}

func (s *HarmovelaSession) Opened() (map[string]any, error) {
	if s.State != StateCreated {
		return nil, errors.New("cannot open session in state " + string(s.State))
	}
	s.State = StateOpened
	now := time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"spec_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.opened",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  now,
		"payload": map[string]any{
			"session_id": s.ID,
			"version":    s.Version,
		},
	}, nil
}

func (s *HarmovelaSession) Ready(capabilities map[string]any) (map[string]any, error) {
	if s.State != StateOpened && s.State != StateCreated {
		return nil, errors.New("cannot mark session ready in state " + string(s.State))
	}
	if s.State == StateCreated {
		if _, err := s.Opened(); err != nil {
			return nil, err
		}
	}
	s.State = StateReady
	now := time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"spec_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.ready",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  now,
		"payload": map[string]any{
			"session_id":   s.ID,
			"capabilities": capabilities,
		},
	}, nil
}

func (s *HarmovelaSession) Close() (map[string]any, error) {
	if s.State == StateClosed {
		return nil, nil
	}
	s.State = StateClosed
	now := time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"spec_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.closed",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  now,
		"payload": map[string]any{
			"session_id": s.ID,
			"reason":     "done",
		},
	}, nil
}

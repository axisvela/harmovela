package event

import (
	"encoding/json"
	"os"
	"strings"
)

type ManifestFixture struct {
	Path          string         `json:"path"`
	Level         string         `json:"level"`
	Description   string         `json:"description"`
	Expectation   string         `json:"expectation"`
	Tags          []string       `json:"tags"`
	ExpectedTypes []string       `json:"expected_types"`
	ExpectedStats map[string]any `json:"expected_stats,omitempty"`
	Profile       string         `json:"profile,omitempty"`
}

type ProfileDef struct {
	DisplayName      string   `json:"display_name"`
	Description      string   `json:"description"`
	RequiredCoreLevel string  `json:"required_core_level"`
	Levels           []string `json:"levels"`
	Fixtures         []string `json:"fixtures"`
}

type Manifest struct {
	SpecVersion        string               `json:"spec_version"`
	DefaultTargetLevel string               `json:"default_target_level"`
	Levels             []string             `json:"levels"`
	Fixtures           []ManifestFixture    `json:"fixtures"`
	Profiles           map[string]ProfileDef `json:"profiles,omitempty"`
}

func LoadManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func LoadFixture(path string) ([]map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var events []map[string]any
	for _, line := range lines {
		if line == "" {
			continue
		}
		var event map[string]any
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}

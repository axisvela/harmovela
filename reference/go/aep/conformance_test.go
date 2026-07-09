package aep

import (
	"path/filepath"
	"reflect"
	"testing"
)

var levelOrder = map[string]int{
	"AEP-C0": 0,
	"AEP-C1": 1,
	"AEP-C2": 2,
}

func TestConformanceManifestDeclaresKnownDraftLevels(t *testing.T) {
	manifest, err := LoadManifest("../../../conformance/manifest.json")
	if err != nil {
		t.Fatalf("failed to load manifest: %v", err)
	}
	expectedLevels := []string{"AEP-C0", "AEP-C1", "AEP-C2"}
	if !reflect.DeepEqual(manifest.Levels, expectedLevels) {
		t.Fatalf("expected levels %v, got %v", expectedLevels, manifest.Levels)
	}
	if manifest.DefaultTargetLevel != "AEP-C1" {
		t.Fatalf("expected default target AEP-C1, got %v", manifest.DefaultTargetLevel)
	}
}

func TestConformanceFixtures(t *testing.T) {
	manifest, err := LoadManifest("../../../conformance/manifest.json")
	if err != nil {
		t.Fatalf("failed to load manifest: %v", err)
	}

	targetLevelOrder, ok := levelOrder[manifest.DefaultTargetLevel]
	if !ok {
		targetLevelOrder = levelOrder["AEP-C1"]
	}

	for _, fixture := range manifest.Fixtures {
		fixtureLevelOrder, ok := levelOrder[fixture.Level]
		if !ok || fixtureLevelOrder > targetLevelOrder {
			t.Logf("SKIP %s %s (above target %s)", fixture.Level, fixture.Path, manifest.DefaultTargetLevel)
			continue
		}

		t.Run(fixture.Level+" "+fixture.Path, func(t *testing.T) {
			absPath := filepath.Join("../../../conformance", fixture.Path)
			events, err := LoadFixture(absPath)
			if err != nil {
				t.Fatalf("failed to load fixture: %v", err)
			}

			types := make([]string, len(events))
			for i, event := range events {
				types[i], _ = event["type"].(string)
			}
			if !reflect.DeepEqual(types, fixture.ExpectedTypes) {
				t.Fatalf("expected types %v, got %v", fixture.ExpectedTypes, types)
			}

			for i, event := range events {
				errs := ValidateEnvelope(event)
				if len(errs) > 0 {
					t.Fatalf("event %d envelope validation: %v", i, errs)
				}
			}

			if fixture.Expectation == "stateful_flow" {
				harness := NewHarness()
				for i, event := range events {
					responses := harness.Handle(event)
					for _, resp := range responses {
						if typ, _ := resp["type"].(string); typ == "event.rejected" {
							errMsg := "unknown"
							if payload, ok := resp["payload"].(map[string]any); ok {
								if errObj, ok := payload["error"].(map[string]any); ok {
									errMsg, _ = errObj["message"].(string)
								}
							}
							t.Fatalf("event %d rejected: %s", i, errMsg)
						}
					}
				}
			}
		})
	}
}

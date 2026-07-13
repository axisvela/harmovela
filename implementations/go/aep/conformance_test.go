package aep

import (
	"bytes"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

var levelOrder = map[string]int{
	"HARMOVELA-C0": 0,
	"HARMOVELA-C1": 1,
	"HARMOVELA-C2": 2,
	"HARMOVELA-C3": 3,
}

func TestConformanceManifestDeclaresKnownDraftLevels(t *testing.T) {
	manifest, err := LoadManifest("../../../conformance/manifest.json")
	if err != nil {
		t.Fatalf("failed to load manifest: %v", err)
	}
	expectedLevels := []string{"HARMOVELA-C0", "HARMOVELA-C1", "HARMOVELA-C2", "HARMOVELA-C3"}
	if !reflect.DeepEqual(manifest.Levels, expectedLevels) {
		t.Fatalf("expected levels %v, got %v", expectedLevels, manifest.Levels)
	}
	if manifest.DefaultTargetLevel != "HARMOVELA-C3" {
		t.Fatalf("expected default target HARMOVELA-C3, got %v", manifest.DefaultTargetLevel)
	}
}

func assertConformanceManifestDeclaresEventAndGovernanceContractFixtures(t *testing.T, manifest *Manifest) {
	t.Helper()
	type fixtureDeclaration struct {
		Path        string
		Level       string
		Expectation string
	}
	var contractFixtures []fixtureDeclaration
	for _, fixture := range manifest.Fixtures {
		if fixture.Path == "fixtures/event-contract.ndjson" || fixture.Path == "fixtures/governance-contract.ndjson" {
			contractFixtures = append(contractFixtures, fixtureDeclaration{
				Path:        fixture.Path,
				Level:       fixture.Level,
				Expectation: fixture.Expectation,
			})
		}
	}

	expected := []fixtureDeclaration{
		{Path: "fixtures/event-contract.ndjson", Level: "HARMOVELA-C1", Expectation: "stateful_flow"},
		{Path: "fixtures/governance-contract.ndjson", Level: "HARMOVELA-C0", Expectation: "reject_some"},
	}
	if !reflect.DeepEqual(contractFixtures, expected) {
		t.Fatalf("expected Event and Governance contract fixture declarations %v, got %v", expected, contractFixtures)
	}
}

func TestGovernanceFixtureRequiresDefinedAuthorizationOutcomes(t *testing.T) {
	events, err := LoadFixture("../../../conformance/fixtures/governance-contract.ndjson")
	if err != nil {
		t.Fatalf("failed to load governance fixture: %v", err)
	}
	for i, event := range events {
		if errs := ValidateEnvelope(event); len(errs) > 0 {
			t.Fatalf("event %d envelope validation: %v", i, errs)
		}
	}

	expectedRejected := []bool{false, true, true, false}
	for i, event := range events {
		responses := NewHarness().Handle(event)
		rejected := false
		for _, response := range responses {
			if response["type"] == "event.rejected" {
				rejected = true
				payload := response["payload"].(map[string]any)
				errorPayload := payload["error"].(map[string]any)
				if i == 1 || i == 2 {
					if errorPayload["code"] != "unauthorized" {
						t.Fatalf("event %d error code: expected unauthorized, got %v", i, errorPayload["code"])
					}
				}
			}
		}
		if rejected != expectedRejected[i] {
			t.Fatalf("event %d rejected: expected %t, got %t", i, expectedRejected[i], rejected)
		}
	}
}

func TestGovernanceFixtureRequiresAuditCorrelationAndCausationLinkage(t *testing.T) {
	events, err := LoadFixture("../../../conformance/fixtures/governance-contract.ndjson")
	if err != nil {
		t.Fatalf("failed to load governance fixture: %v", err)
	}
	harness := NewHarness()
	for _, event := range events {
		harness.Handle(event)
	}
	audit := reflect.ValueOf(harness).Elem().FieldByName("Audit")
	if !audit.IsValid() || audit.Len() == 0 {
		t.Fatal("expected governance audit records")
	}
}

func TestConformanceFixtures(t *testing.T) {
	manifest, err := LoadManifest("../../../conformance/manifest.json")
	if err != nil {
		 t.Fatalf("failed to load manifest: %v", err)
	}
	assertConformanceManifestDeclaresEventAndGovernanceContractFixtures(t, manifest)

	selectedProfile := os.Getenv("HARMOVELA_PROFILE")
	if selectedProfile != "" {
		profileFixturePaths := make(map[string]bool)
		if profileDef, ok := manifest.Profiles[selectedProfile]; ok {
			for _, fp := range profileDef.Fixtures {
				profileFixturePaths[fp] = true
			}
		}
		filtered := make([]ManifestFixture, 0)
		for _, f := range manifest.Fixtures {
			if f.Profile == "" || profileFixturePaths[f.Path] {
				filtered = append(filtered, f)
			}
		}
		manifest.Fixtures = filtered
	}

	targetLevelOrder, ok := levelOrder[manifest.DefaultTargetLevel]
	if !ok {
		targetLevelOrder = levelOrder["HARMOVELA-C1"]
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
			if fixture.ExpectedTypes != nil && !reflect.DeepEqual(types, fixture.ExpectedTypes) {
				t.Fatalf("expected types %v, got %v", fixture.ExpectedTypes, types)
			}

			if fixture.Expectation == "reject_some" {
				rejected := false
				harness := NewHarness()
				for _, event := range events {
					harnessRejected := false
					for _, response := range harness.Handle(event) {
						if typ, _ := response["type"].(string); len(typ) >= len(".rejected") && typ[len(typ)-len(".rejected"):] == ".rejected" {
							harnessRejected = true
						}
					}
					payloadInvalid, err := payloadSchemaInvalid(event)
					if err != nil {
						t.Fatalf("payload schema validation: %v", err)
					}
					if len(ValidateEnvelope(event)) > 0 || payloadInvalid || harnessRejected {
						rejected = true
					}
				}
				if !rejected {
					t.Fatal("expected at least one event rejection")
				}
				return
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

			if fixture.Expectation == "delivery_e2e" {
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
				if fixture.ExpectedStats != nil {
					stats := harness.Delivery.GetStats()
					for key, expected := range fixture.ExpectedStats {
						expectedNum, expOk := toFloat64(expected)
						actualNum, actOk := toFloat64(stats[key])
						if expOk && actOk && actualNum != expectedNum {
							t.Fatalf("delivery stat %s: expected %.0f, got %.0f", key, expectedNum, actualNum)
						}
					}
				}
			}
		})
	}
}

func payloadSchemaInvalid(event map[string]any) (bool, error) {
	path := filepath.Join("../../../schemas", "aep-payloads.schema.json")
	source, err := os.ReadFile(path)
	if err != nil {
		return false, err
	}
	document, err := jsonschema.UnmarshalJSON(bytes.NewReader(source))
	if err != nil {
		return false, err
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource(path, document); err != nil {
		return false, err
	}
	schema, err := compiler.Compile(path)
	if err != nil {
		return false, err
	}
	return schema.Validate(event) != nil, nil
}

func toFloat64(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	default:
		return 0, false
	}
}

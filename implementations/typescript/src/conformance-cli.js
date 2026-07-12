#!/usr/bin/env node
import { runConformance } from "./conformance.js";

const targetArg = process.argv.find((arg) => arg.startsWith("--level="));
const targetLevel = targetArg ? targetArg.slice("--level=".length) : undefined;
const profileArg = process.argv.find((arg) => arg.startsWith("--profile="));
const profile = profileArg ? profileArg.slice("--profile=".length) : undefined;

try {
  const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel, profile });

  console.log(`Harmovela conformance target: ${resolvedTarget}`);

  let failed = false;
  for (const result of results) {
    const label = `${result.fixture.level} ${result.fixture.path}`;
    if (result.status === "skipped") {
      console.log(`SKIP ${label} (${result.reason})`);
      continue;
    }
    if (result.status === "passed") {
      console.log(`PASS ${label}`);
      continue;
    }
    failed = true;
    console.error(`FAIL ${label}`);
    for (const failure of result.failures) {
      console.error(`  - ${failure}`);
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exitCode = 1;
}

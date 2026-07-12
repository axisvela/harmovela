import { runConformance } from "../../conformance.js";

export async function conformanceCommand(options = {}) {
  const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel: options.level, profile: options.profile });
  console.log(`Harmovela conformance target: ${resolvedTarget}`);
  let failed = false;
  for (const result of results) {
    const label = `${result.fixture.level} ${result.fixture.path}`;
    if (result.status === "skipped") console.log(`SKIP ${label} (${result.reason})`);
    else if (result.status === "passed") console.log(`PASS ${label}`);
    else { failed = true; console.error(`FAIL ${label}`); }
  }
  if (failed) process.exitCode = 1;
}

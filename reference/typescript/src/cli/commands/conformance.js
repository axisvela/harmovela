import { runConformance } from "../../conformance.js";

export async function conformanceCommand(args) {
  const targetArg = args.find((arg) => arg.startsWith("--level="));
  const targetLevel = targetArg ? targetArg.slice("--level=".length) : undefined;
  const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel });
  console.log(`AEP conformance target: ${resolvedTarget}`);
  let failed = false;
  for (const result of results) {
    const label = `${result.fixture.level} ${result.fixture.path}`;
    if (result.status === "skipped") console.log(`SKIP ${label} (${result.reason})`);
    else if (result.status === "passed") console.log(`PASS ${label}`);
    else { failed = true; console.error(`FAIL ${label}`); }
  }
  if (failed) process.exitCode = 1;
}

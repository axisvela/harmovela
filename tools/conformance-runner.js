import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const manifest = JSON.parse(
  readFileSync(resolve(ROOT, "conformance", "manifest.json"), "utf-8")
);

const profileArg = process.argv.find((a) => a.startsWith("--profile="));
const selectedProfile = profileArg ? profileArg.split("=")[1] : null;

let fixtures = manifest.fixtures.map((f) => f.path);
if (selectedProfile) {
  const profileFixturePaths = new Set(
    manifest.profiles?.[selectedProfile]?.fixtures ?? []
  );
  fixtures = manifest.fixtures
    .filter((f) => !f.profile || profileFixturePaths.has(f.path))
    .map((f) => f.path);
}

const levels = Object.fromEntries(
  manifest.fixtures.map((f) => [f.path, f.level])
);
const fixtureProfiles = Object.fromEntries(
  manifest.fixtures.map((f) => [f.path, f.profile || null])
);
const targetLevel = manifest.default_target_level || "HARMOVELA-C1";
const LEVEL_ORDER = { "HARMOVELA-C0": 0, "HARMOVELA-C1": 1, "HARMOVELA-C2": 2, "HARMOVELA-C3": 3 };

function isAboveTarget(fixturePath) {
  return (
    (LEVEL_ORDER[levels[fixturePath]] || 0) > (LEVEL_ORDER[targetLevel] || 1)
  );
}

const LANGUAGES = {
  TypeScript: {
    cwd: "implementations/typescript",
    cmd: "npm",
    args: ["run", "conformance"],
  },
  Python: {
    cwd: "implementations/python",
    cmd: "python",
    args: ["-m", "pytest", "tests/test_fixtures.py", "-q", "--tb=no"],
  },
  Go: {
    cwd: "implementations/go",
    cmd: "go",
    args: ["test", "./aep/", "-run", "TestConformance", "-v"],
  },
  Java: {
    cwd: "implementations/java",
    cmd: "mvn",
    args: ["test", "-pl", ".", "-Dtest=ConformanceTest", "-q"],
  },
};

function runCommand(cwd, cmd, args) {
  const cmdline = [cmd, ...args].join(" ");
  const result = spawnSync(cmdline, [], {
    cwd: resolve(ROOT, cwd),
    timeout: 60000,
    encoding: "utf-8",
    shell: true,
  });

  if (result.error && result.error.code === "ENOENT") {
    return {
      exitCode: -1,
      stdout: "",
      stderr: "",
      notFound: true,
    };
  }

  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ? String(result.stdout) : "",
    stderr: result.stderr ? String(result.stderr) : "",
    timedOut: result.error?.code === "ETIMEDOUT",
  };
}

function parseResults(stdout, stderr, exitCode) {
  const parsed = {};
  for (const f of fixtures) parsed[f] = "SKIP";

  const combined = stdout + "\n" + stderr;

  const explicitPattern =
    /(^|\n|\r|:\s+)(PASS|SKIP|FAIL)\s+(?:HARMOVELA-C\d\s+)?(fixtures\/[\w.\/-]+)/gm;
  let match;
  while ((match = explicitPattern.exec(combined)) !== null) {
    parsed[match[3]] = match[2];
  }

  const goTestPattern =
    /---\s+(PASS|FAIL|SKIP):[^\n]*?(fixtures\/[\w.\/-]+)/g;
  while ((match = goTestPattern.exec(combined)) !== null) {
    parsed[match[2]] = match[1];
  }

  const pyFailPattern = /FAILED[^\n]*?\[(fixtures\/[\w.\/-]+)\]/g;
  while ((match = pyFailPattern.exec(combined)) !== null) {
    parsed[match[1]] = "FAIL";
  }

  const javaFailPattern =
    /<<< FAILURE![^\n]*?(fixtures\/[\w.\/-]+)|(?:fail(?:ure|ed)[^\n]*?)(fixtures\/[\w.\/-]+)/gi;
  while ((match = javaFailPattern.exec(combined)) !== null) {
    const p = match[1] || match[2];
    if (p) parsed[p] = "FAIL";
  }

  for (const f of fixtures) {
    if (parsed[f] === "SKIP" && !isAboveTarget(f)) {
      parsed[f] = exitCode === 0 ? "PASS" : "FAIL";
    }
  }

  return parsed;
}

const results = {};
let anyFail = false;

for (const [lang, config] of Object.entries(LANGUAGES)) {
  const { exitCode, stdout, stderr, notFound, timedOut } = runCommand(
    config.cwd,
    config.cmd,
    config.args
  );

  if (notFound || timedOut) {
    results[lang] = Object.fromEntries(fixtures.map((f) => [f, "SKIP"]));
    continue;
  }

  results[lang] = parseResults(stdout, stderr, exitCode);
}

for (const f of fixtures) {
  for (const lang of Object.keys(LANGUAGES)) {
    if (results[lang][f] === "FAIL") anyFail = true;
  }
}

const COL_WIDTH = 30;

const header =
  "Cross-Language Conformance\n\n" +
  "Fixture".padEnd(COL_WIDTH) +
  Object.keys(LANGUAGES)
    .map((l) => l.padEnd(14))
    .join("") +
  "\n" +
  "-".repeat(COL_WIDTH + Object.keys(LANGUAGES).length * 14);

console.log(header);

for (const f of fixtures) {
  const row =
    f.padEnd(COL_WIDTH) +
    Object.keys(LANGUAGES)
      .map((l) => (results[l][f] || "SKIP").padEnd(14))
      .join("");
  console.log(row);
}

const profileNames = Object.keys(manifest.profiles || {});
if (profileNames.length > 0) {
  const coreFixtureNames = manifest.fixtures
    .filter((f) => !f.profile)
    .map((f) => f.path);
  const summaryParts = [];
  const coreFail = coreFixtureNames.some((f) =>
    Object.values(results).some((r) => r[f] === "FAIL")
  );
  summaryParts.push(`core: ${coreFail ? "FAIL" : "PASS"}`);

  for (const pn of profileNames) {
    const pfPaths = new Set(manifest.profiles[pn].fixtures || []);
    const pfIncluded = fixtures.some((f) => pfPaths.has(f));
    if (!pfIncluded) {
      summaryParts.push(`${pn}: SKIP`);
    } else {
      const pfFail = [...pfPaths].some((f) =>
        Object.values(results).some((r) => r[f] === "FAIL")
      );
      const pfAllSkip = [...pfPaths].every((f) =>
        Object.values(results).every((r) => r[f] === "SKIP")
      );
      summaryParts.push(`${pn}: ${pfAllSkip ? "SKIP" : pfFail ? "FAIL" : "PASS"}`);
    }
  }
  console.log("\nSummary: " + summaryParts.join(", "));
}

process.exit(anyFail ? 1 : 0);

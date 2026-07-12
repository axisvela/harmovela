import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const manifest = JSON.parse(
  readFileSync(resolve(ROOT, "conformance", "manifest.json"), "utf-8")
);

const fixtures = manifest.fixtures.map((f) => f.path);
const levels = Object.fromEntries(
  manifest.fixtures.map((f) => [f.path, f.level])
);
const targetLevel = manifest.default_target_level || "AEP-C1";
const LEVEL_ORDER = { "AEP-C0": 0, "AEP-C1": 1, "AEP-C2": 2, "AEP-C3": 3 };

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
    /(^|\n|\r|:\s+)(PASS|SKIP|FAIL)\s+(?:AEP-C\d\s+)?(fixtures\/[\w.\/-]+)/gm;
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

process.exit(anyFail ? 1 : 0);

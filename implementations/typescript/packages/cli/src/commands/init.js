import { writeDefaultConfig } from "@axisvela/harmovela-runtime";

export async function initCommand(options = {}) {
  const file = options.config ?? "aep.config.json";
  await writeDefaultConfig(file);
  console.log(`created ${file}`);
}

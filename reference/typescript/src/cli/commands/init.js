import { writeDefaultConfig } from "../../runtime/config.js";

export async function initCommand(args) {
  const file = valueAfter(args, "--config") ?? "aep.config.json";
  await writeDefaultConfig(file);
  console.log(`created ${file}`);
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

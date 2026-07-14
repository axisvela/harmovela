import { stdin, stdout } from "node:process";

export function runMcpBridge(bridge) {
  let buffer = "";

  stdin.setEncoding("utf8");
  stdin.on("data", async (chunk) => {
    buffer += chunk;

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim().length === 0) continue;

      try {
        const request = JSON.parse(line);
        const response = await bridge.handleRequest(request);
        if (response) {
          stdout.write(JSON.stringify(response) + "\n");
        }
      } catch (err) {
        stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: `Parse error: ${err.message}` }
        }) + "\n");
      }
    }
  });

  stdin.on("end", () => {
    process.exit(0);
  });
}

export async function statusCommand(options = {}) {
  const url = options.url ?? "http://127.0.0.1:8789/healthz";
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`status request failed: ${err.message}`);
  }
  if (!response.ok) throw new Error(`status request failed: HTTP ${response.status}`);
  const text = await response.text();
  console.log(text);
}

# AEP Examples

Two categories of examples.

## SDK examples (`examples/sdk/`)

Embed AEP in-process by importing `@axisrobo/aep`. Run from the repo root after `npm install`:

```bash
node examples/sdk/runtime-embed.js
node examples/sdk/agent-subscriber.js
node examples/sdk/memory-event-producer.js
```

## Service examples (`examples/service/`)

Connect to a running `aepd` daemon. Start it first:

```bash
npm run aep --workspace @axisrobo/aep -- init --config aep.config.json
npm run aepd --workspace @axisrobo/aep
```

Then run a client:

```bash
node examples/service/emit-and-subscribe.js
node examples/service/http-api-client.js
```

Requires `npm install` at the repo root so the `@axisrobo/aep` workspace link exists.

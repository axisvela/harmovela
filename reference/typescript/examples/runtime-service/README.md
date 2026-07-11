# AEP Runtime Service Example

This example shows the first productized TypeScript shape: SDK + `aepd` + `aep` CLI.

```bash
npm run aep -- init --config aep.config.json
npm run aep -- start --config aep.config.json
```

In another terminal:

```bash
npm run aep -- subscribe --type 'task.*'
```

In a third terminal:

```bash
npm run aep -- emit task.submitted --payload '{"task_id":"task_01"}'
```

The runtime remains protocol-first. It is not an agent framework or workflow engine.

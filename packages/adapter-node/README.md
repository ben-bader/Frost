# @frost.js/adapter-node

Node.js `http` adapter for [Frost](https://github.com/ben-bader/Frost): static file serving with path containment, content-negotiated compression, `/healthz`, and graceful shutdown.

`frost start` uses this automatically — import `createNodeServer` directly for a custom listener or embedding.

## Install

```bash
npm install @frost.js/adapter-node
```

## Example

```ts
import { createNodeServer } from "@frost.js/adapter-node";

const server = createNodeServer({
  port: 3000,
  staticDirs: ["public", ".frost/client"],
  handleRequest, // from createRequestHandler
});
server.listen();
```

## Docs

[docs/api/adapter-node.md](https://github.com/ben-bader/Frost/blob/main/docs/api/adapter-node.md) · [Deployment](https://github.com/ben-bader/Frost/blob/main/docs/guides/deployment.md)

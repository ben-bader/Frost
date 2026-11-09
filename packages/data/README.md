# @frost.js/data

Loaders, actions, forms, CSRF validation, memoization, and `createServerFn` server functions for [Frost](https://github.com/ben-bader/Frost).

Route loaders/actions are plain exports — you don't import this for them. Use it directly for `createServerFn` (typed RPC callable from client code), `validateCsrf`, and request-scoped `dedupe`.

## Install

```bash
npm install @frost.js/data
```

## Example

```ts
import { createServerFn } from "@frost.js/data";

export const getGreeting = createServerFn(async ({ name }: { name: string }) => {
  return `Hello, ${name}`;
});
```

## Docs

[docs/api/data.md](https://github.com/ben-bader/Frost/blob/main/docs/api/data.md) · [Data loading guide](https://github.com/ben-bader/Frost/blob/main/docs/guides/data-loading.md)

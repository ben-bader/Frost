# @frost.js/data

> Loaders, actions, forms, CSRF, memoization, and server functions.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/data
```

Route modules usually don't import this directly — loaders/actions are plain exports. Use it for `createServerFn`, form helpers, and CSRF internals.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `createServerFn<TInput, TOutput>(handler)` | fn | Define a typed RPC server function |
| `getServerFn(id)`, `listServerFnNames()` | fns | Server-side registry access |
| `RegisteredServerFn`, `ServerFn`, `ServerFnContext`, `ServerFnConfig`, `ServerFnHandler`, `ServerFnDispatchOptions` | types | Server-fn types |
| `frostServerFnFetch(...)` | fn | Client-side transport for server fns |
| `validateCsrf(request, options?)` | fn | Origin check for mutations |
| `CsrfOptions` | type | CSRF options |
| `dedupe<T>(...)` | fn | Request-scoped memoization helper |
| `memo` helpers (`packages/data/src/memo.ts`) | fns | Loader memoization across parallel calls |
| `parseFormData`/`formDataToObject` re-exports | fns | Form body helpers |
| `setBodyLimits`, `getBodyLimits` | fns | Runtime body-size limit overrides |
| `parseJson` | fn | JSON body parsing with limit enforcement |

## Server functions in one paragraph

`createServerFn` registers a handler server-side and emits a client stub; calls go over POST `/_frost/fn/<id>` (configurable via `serverFns.path`), are CSRF-validated, input-validated against the fn's schema, and typed end-to-end. See [data loading](../guides/data-loading.md).

## Related

- [Data loading](../guides/data-loading.md) · [Server functions](../architecture.md)

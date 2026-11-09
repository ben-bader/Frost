# @frost.js/react

React bindings for [Frost](https://github.com/ben-bader/Frost): document shell, hydration, `<Link>`, and error boundaries.

The Vite plugin wires hydration automatically — import this for a custom `Document`, the `Link` component, `ErrorBoundary`, or the request context in client components.

## Install

```bash
npm install @frost.js/react
```

## Example

```tsx
import { Link } from "@frost.js/react";

export function Nav() {
  return <Link href="/about">About</Link>;
}
```

## Docs

[docs/api/react.md](https://github.com/ben-bader/Frost/blob/main/docs/api/react.md) · [Rendering](https://github.com/ben-bader/Frost/blob/main/docs/rendering.md)

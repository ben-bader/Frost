# 003 — Static file containment

Context: the static guard was a regex strip of leading `../` (audit F8) — bypassable via encoding, backslashes, absolute paths, and symlinks.

Options: keep regex + more patterns; `path.resolve` + `startsWith`; `path.relative` containment + `realpathSync`.

Decision: `resolveStaticPath` decodes once (malformed escapes rejected), strips leading separators, resolves against the root, requires `path.relative(root, candidate)` to stay inside, then compares `realpathSync` of both to block symlink escapes. Null bytes rejected. Returns the real path or null.

Consequences: correct on Windows (drive letters, UNC, case) and POSIX; one extra `realpathSync` per static hit (cheap, files are small in number); symlinked assets inside the root still work because both sides are realpathed.

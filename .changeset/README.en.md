# Changesets

This directory stores release intent files created by `pnpm changeset`.

Suggested release flow:

```bash
pnpm changeset
pnpm version-packages
pnpm install
pnpm build
```

Commit the version + changelog changes, then create and push a `v*` tag to publish from GitHub Actions.

Chinese version: [README.md](README.md)

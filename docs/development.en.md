# Development Guide

Chinese version: [development.md](development.md)

## Repository Layout

```txt
packages/
  core/
  config/
  redis/
  scheduler/
.github/workflows/
  ci.yml
  publish.yml
```

Package conventions:

```txt
src/
  index.ts
package.json
README.md
README.en.md
tsconfig.json
tsup.config.ts
vitest.config.ts
```

## Commands

Install dependencies:

```bash
pnpm install
```

Common commands:

```bash
pnpm build
pnpm clean
pnpm test
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

## Tooling

- Package manager: `pnpm`
- Build: `tsup`
- Tests: `vitest`
- Formatting: `prettier`
- Lint: `eslint` (flat config)
- Git hooks: `husky`
- Staged checks: `lint-staged`
- Commit message linting: `commitlint`
- Versioning and publishing: `changesets`

## CI

PRs and `main` pushes run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Versioning (Changesets)

Create a changeset:

```bash
pnpm changeset
```

Prepare a release (versions + changelogs):

```bash
pnpm version-packages
pnpm install
pnpm build
```

Commit the changes, then create and push a unique `v*` tag:

```bash
git tag v-redis-0.2.0
git push origin v-redis-0.2.0
```

Notes:

- In this repo, a `v*` tag is only a publish workflow trigger, not a shared version number for every package
- In a monorepo, different packages can have different versions; the source of truth is each package's `package.json` and changelog
- To avoid collisions with existing tags, use a unique tag that includes the package name or release batch, for example `v-redis-0.2.0` or `v-release-2026-04-27`

## Publishing and Trusted Publishing

This repo uses npm Trusted Publishing (GitHub Actions OIDC). The publishing workflow is `publish.yml`.

First publish notes:

- npm packages must exist before you can configure a Trusted Publisher on npmjs.com
- npm typically requires publish 2FA (or a granular token with bypass 2FA)

Suggested first publish flow:

```bash
pnpm install
pnpm build

pnpm --filter @raytonx/core publish --access public --otp <one-time-password>
pnpm --filter @raytonx/config publish --access public --otp <one-time-password>
pnpm --filter @raytonx/nest-redis publish --access public --otp <one-time-password>
```

After the first publish, configure Trusted Publisher on npmjs.com for each package:

```txt
Provider: GitHub Actions
Organization or user: raytonx-labs
Repository: raytonx-nest-modules
Workflow filename: publish.yml
Environment name: leave empty
```

After that, you do not need `NPM_TOKEN` in GitHub secrets. Push a unique `v*` tag to publish.

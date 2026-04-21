# Raytonx Nest Modules

A monorepo for independently installable NestJS modules.

This repository is intended to host reusable NestJS infrastructure packages such as
configuration, logging, scheduling, cache, Redis, MongoDB, and PostgreSQL integrations.
Each package should be buildable, testable, and publishable on its own.

## Packages

- `@raytonx/core` - shared types and utilities for Raytonx NestJS modules.
- `@raytonx/config` - configuration module with env file loading for NestJS applications.

Planned packages:

- `@raytonx/logger`
- `@raytonx/schedule`
- `@raytonx/cache`
- `@raytonx/redis`
- `@raytonx/mongodb`
- `@raytonx/postgresql`

## Repository Layout

```txt
packages/
  core/
  config/
examples/
docs/
```

Each package is expected to expose its public API from `src/index.ts` and build to
`dist` with CommonJS, ESM, and TypeScript declaration outputs.

## Development

```bash
pnpm install
```

Common commands:

```bash
pnpm build          # build all packages
pnpm clean          # remove package dist folders
pnpm test           # run package tests
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

## Tooling

- Package manager: `pnpm`
- Build: `tsup`
- TypeScript: strict mode enabled from `tsconfig.base.json`
- Tests: `vitest`
- Linting: `eslint` flat config
- Formatting: `prettier`
- Git hooks: `husky`
- Staged file checks: `lint-staged`
- Commit message linting: `commitlint`
- Versioning and publishing: `changesets`

## CI

GitHub Actions runs the following checks on `main` pushes and pull requests:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Versioning and Publishing

Packages are published under the npm organization scope `@raytonx`.

Create a changeset for package changes:

```bash
pnpm changeset
```

When preparing a release, update package versions and changelogs:

```bash
pnpm version-packages
pnpm install
pnpm build
```

Commit the generated version and changelog changes, then create and push a release tag:

```bash
git tag v0.1.0
git push origin main --tags
```

Pushing a `v*` tag starts the publish workflow. It runs checks, builds packages, and publishes
unpublished package versions to npm with `pnpm changeset publish`.

Publishing uses npm Trusted Publishing through GitHub Actions OIDC, so no npm automation
token is required in GitHub secrets after Trusted Publishing is configured.

### First Publish

npm requires a package to exist before its Trusted Publisher can be configured. For the
first publish of each package, publish manually from a local npm account that belongs to
the `@raytonx` organization and has publish permission.

npm requires either account 2FA for publishing or a granular access token with bypass 2FA.
Prefer account 2FA for the first publish, then use Trusted Publishing for all future
publishes.

Build before publishing:

```bash
pnpm install
pnpm build
```

Publish `@raytonx/core` first:

```bash
pnpm --filter @raytonx/core publish --access public --otp <one-time-password>
```

Then publish `@raytonx/config`:

```bash
pnpm --filter @raytonx/config publish --access public --otp <one-time-password>
```

Use `pnpm publish` instead of running `npm publish` inside package folders so workspace
dependencies are handled correctly.

### Trusted Publishing Setup

After the first publish, configure Trusted Publishing separately for each npm package:

- `@raytonx/core`
- `@raytonx/config`

On npmjs.com, open the package page and go to:

```txt
Settings -> Trusted Publisher -> GitHub Actions
```

Use this trusted publisher configuration:

```txt
Provider: GitHub Actions
Organization or user: raytonx-labs
Repository: raytonx-nest-modules
Workflow filename: publish.yml
Environment name: leave empty
```

The GitHub owner is `raytonx-labs` because the repository is
`raytonx-labs/raytonx-nest-modules`. This is separate from the npm organization scope
`@raytonx`.

After Trusted Publishing is configured, future releases are published by pushing a `v*`
tag. Do not add an `NPM_TOKEN` secret for publishing.

## Git Hooks

Install hooks after cloning:

```bash
pnpm install
```

The `prepare` script runs Husky setup automatically.

Pre-commit runs `lint-staged`, which formats and lints staged files.

Commit messages must follow Conventional Commits:

```txt
feat: add redis module
fix: handle missing config value
chore: update build tooling
```

## Package Guidelines

Every package should include:

```txt
src/
  index.ts
package.json
README.md
tsconfig.json
tsup.config.ts
vitest.config.ts
```

Prefer `peerDependencies` for NestJS framework packages so consuming applications control
their NestJS version.

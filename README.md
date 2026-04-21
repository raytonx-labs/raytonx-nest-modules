# Raytonx Nest Modules

A monorepo for independently installable NestJS modules.

This repository is intended to host reusable NestJS infrastructure packages such as
configuration, logging, scheduling, cache, Redis, MongoDB, and PostgreSQL integrations.
Each package should be buildable, testable, and publishable on its own.

## Packages

- `@raytonx/core` - shared types and utilities for Raytonx NestJS modules.
- `@raytonx/config` - configuration module for NestJS applications.

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

# @raytonx/core

Shared utilities and types for Raytonx NestJS modules.

Chinese version: `README.md`

## Installation

```bash
pnpm add @raytonx/core
```

```bash
npm i @raytonx/core
```

```bash
yarn add @raytonx/core
```

## Exports

- `createInjectionToken(packageName, tokenName)` - creates a namespaced injection token.
- `MaybePromise<T>` - `T | Promise<T>`.
- `AsyncModuleOptions<T>` - helper type for async module options.

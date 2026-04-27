# 开发文档（中文）

English version: [development.en.md](development.en.md)

## 仓库结构

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

每个 package 约定：

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

## 开发命令

安装依赖：

```bash
pnpm install
```

常用命令：

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

## 工具链

- 包管理：`pnpm`
- 构建：`tsup`
- 测试：`vitest`
- 格式化：`prettier`
- Lint：`eslint`（flat config）
- Git hooks：`husky`
- staged 校验：`lint-staged`
- 提交信息校验：`commitlint`
- 版本与发布：`changesets`

## CI

PR 和 `main` push 会运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 版本管理（Changesets）

为变更创建 changeset：

```bash
pnpm changeset
```

准备发布时更新版本与 changelog：

```bash
pnpm version-packages
pnpm install
pnpm build
```

提交上述变更后，通过创建并 push `v*` tag 触发发布：

```bash
git tag v0.1.0
git push origin main --tags
```

## npm 发布与 Trusted Publishing

本仓库使用 npm Trusted Publishing（GitHub Actions OIDC），发布 workflow 为 `publish.yml`。

首次发布注意：

- npm 需要 package 先存在，才能在 npmjs.com 配置 Trusted Publisher
- npm 通常要求发布账号启用 2FA（或使用带 bypass 2FA 的 granular token）

首次手动发布建议流程：

```bash
pnpm install
pnpm build

pnpm --filter @raytonx/core publish --access public --otp <one-time-password>
pnpm --filter @raytonx/config publish --access public --otp <one-time-password>
pnpm --filter @raytonx/nest-redis publish --access public --otp <one-time-password>
```

首次发布完成后，在 npmjs.com 对每个 package 分别配置 Trusted Publisher：

```txt
Provider: GitHub Actions
Organization or user: raytonx-labs
Repository: raytonx-nest-modules
Workflow filename: publish.yml
Environment name: 留空
```

之后发布不需要在 GitHub secrets 里配置 `NPM_TOKEN`，只需要 push `v*` tag。

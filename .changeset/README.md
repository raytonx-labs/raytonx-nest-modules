# Changesets（中文）

这个目录保存由 `pnpm changeset` 生成的发布意图文件（changeset files）。

发布建议流程：

```bash
pnpm changeset
pnpm version-packages
pnpm install
pnpm build
```

将版本与 changelog 的改动提交后，通过创建并 push `v*` tag 触发 GitHub Actions 自动发布。

English release workflow docs are in [docs/development.en.md](../docs/development.en.md).

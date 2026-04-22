# RaytonX Nest Packages

这是 RaytonX 的 NestJS 可复用基础设施模块仓库（monorepo）。每个模块都可以独立安装、独立构建与发布。

English version: [README.en.md](README.en.md)

## 包列表

- `@raytonx/core`：通用类型与工具方法（Nest 模块公共能力）。[packages/core/README.md](packages/core/README.md)
- `@raytonx/config`：配置模块（env 文件加载 + Zod 校验/转换）。[packages/config/README.md](packages/config/README.md)

## 开发文档

仓库结构、开发命令、工具链、CI、Changesets 版本管理、npm Trusted Publishing 发布流程等内容见：

- 中文：[docs/development.md](docs/development.md)
- English: [docs/development.en.md](docs/development.en.md)

# @raytonx/core

Raytonx NestJS 模块的通用类型与工具方法。

English version: `README.en.md`

## 安装

```bash
pnpm add @raytonx/core
```

```bash
npm i @raytonx/core
```

```bash
yarn add @raytonx/core
```

## 导出内容

- `createInjectionToken(packageName, tokenName)`：生成带命名空间的注入 token
- `MaybePromise<T>`：`T | Promise<T>`
- `AsyncModuleOptions<T>`：异步模块 options 的辅助类型

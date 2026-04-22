# @raytonx/config

用于 NestJS 应用的配置模块。

English version: [README.en.md](README.en.md)

## 安装

```bash
pnpm add @raytonx/config
```

```bash
npm i @raytonx/config
```

```bash
yarn add @raytonx/config
```

## 快速开始

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@raytonx/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "auto",
      values: {
        appName: "api",
      },
    }),
  ],
})
export class AppModule {}
```

当 `envFilePath: "auto"` 时，模块会在当前工作目录按以下顺序尝试加载：

```txt
.env
.env.local
.env.${NODE_ENV}
.env.${NODE_ENV}.local
```

后加载的文件会覆盖先加载的文件。`process.env` 的优先级最高。

## 环境文件

加载单个文件：

```ts
ConfigModule.forRoot({
  envFilePath: ".env.development",
});
```

加载多个文件：

```ts
ConfigModule.forRoot({
  envFilePath: [".env", ".env.local"],
});
```

禁用 env 文件加载：

```ts
ConfigModule.forRoot({
  envFilePath: false,
});
```

## 变量展开

默认开启变量展开：

```env
APP_HOST=localhost
APP_PORT=3000
APP_URL=http://${APP_HOST}:${APP_PORT}
```

需要时可关闭：

```ts
ConfigModule.forRoot({
  envFilePath: "auto",
  expandVariables: false,
});
```

## ConfigService

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@raytonx/config";

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  get port(): string {
    return this.config.getOrThrow("PORT");
  }
}
```

## 覆盖（Overrides）

通过 `values` 在模块初始化时显式覆盖配置：

```ts
ConfigModule.forRoot({
  envFilePath: "auto",
  values: {
    APP_NAME: "api",
  },
});
```

默认优先级如下：

```txt
env 文件 < values < process.env
```

## Schema 校验

使用 Zod 在模块初始化阶段对配置进行校验与转换：

```ts
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
});

type AppConfig = z.infer<typeof configSchema>;

ConfigModule.forRoot<AppConfig>({
  isGlobal: true,
  envFilePath: "auto",
  schema: configSchema,
});
```

校验失败时，`ConfigModule` 会抛出 `ConfigValidationError`，并包含失败路径与 Zod 报错信息。

通过 `ConfigService` 可以访问校验后的值：

```ts
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  get port(): number {
    return this.config.getOrThrow("PORT");
  }
}
```

## 总结

- 通过 `envFilePath` 加载 env 文件（`"auto" | string | string[] | false`）
- `"auto"` 加载顺序：`.env`、`.env.local`、`.env.${NODE_ENV}`、`.env.${NODE_ENV}.local`
- 默认展开 `${VAR}` 与 `$VAR`（`expandVariables: false` 可关闭）
- 默认优先级：`env 文件 < values < process.env`
- 通过 `schema`（Zod）进行校验与转换

## 完整示例

`.env.development`：

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=https://example.invalid
```

`src/app.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@raytonx/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
});

export type AppConfig = z.infer<typeof configSchema>;

@Module({
  imports: [
    ConfigModule.forRoot<AppConfig>({
      isGlobal: true,
      envFilePath: "auto",
      schema: configSchema,
    }),
  ],
})
export class AppModule {}
```

`src/app.service.ts`：

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@raytonx/config";

import type { AppConfig } from "./app.module";

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  get port(): number {
    return this.config.getOrThrow("PORT");
  }
}
```

`src/main.ts`：

```ts
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

void bootstrap();
```

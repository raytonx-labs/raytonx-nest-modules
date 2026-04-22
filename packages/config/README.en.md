# @raytonx/config

Configuration module for NestJS applications.

Chinese version: `README.md`

## Installation

```bash
pnpm add @raytonx/config
```

```bash
npm i @raytonx/config
```

```bash
yarn add @raytonx/config
```

## Quick Start

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

With `envFilePath: "auto"`, the module resolves files from the current working directory using this
order:

```txt
.env
.env.local
.env.${NODE_ENV}
.env.${NODE_ENV}.local
```

Later files override earlier files. Existing `process.env` values have the highest priority.

## Environment Files

Load a single file:

```ts
ConfigModule.forRoot({
  envFilePath: ".env.development",
});
```

Load multiple files:

```ts
ConfigModule.forRoot({
  envFilePath: [".env", ".env.local"],
});
```

Disable env file loading:

```ts
ConfigModule.forRoot({
  envFilePath: false,
});
```

## Variable Expansion

Variable expansion is enabled by default:

```env
APP_HOST=localhost
APP_PORT=3000
APP_URL=http://${APP_HOST}:${APP_PORT}
```

Disable it when needed:

```ts
ConfigModule.forRoot({
  envFilePath: "auto",
  expandVariables: false,
});
```

## Config Service

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

## Overrides

Use `values` for explicit overrides during module initialization:

```ts
ConfigModule.forRoot({
  envFilePath: "auto",
  values: {
    APP_NAME: "api",
  },
});
```

By default, `process.env` has the highest priority. The effective precedence is:

```txt
env files < values < process.env
```

## Schema Validation

Use Zod to validate and transform configuration during module initialization:

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

If validation fails, `ConfigModule` throws `ConfigValidationError` with the failing config path
and Zod message.

Validated values are exposed through `ConfigService`:

```ts
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  get port(): number {
    return this.config.getOrThrow("PORT");
  }
}
```

## Summary

- Loads env files via `envFilePath` (`"auto" | string | string[] | false`)
- Resolves `"auto"` env files in this order: `.env`, `.env.local`, `.env.${NODE_ENV}`, `.env.${NODE_ENV}.local`
- Expands `${VAR}` and `$VAR` by default (`expandVariables: false` to disable)
- Precedence is `env files < values < process.env` by default
- Validates and transforms config with `schema` (Zod)

## Complete Example

`.env.development`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=https://example.invalid
```

`src/app.module.ts`:

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

`src/app.service.ts`:

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

`src/main.ts`:

```ts
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

void bootstrap();
```

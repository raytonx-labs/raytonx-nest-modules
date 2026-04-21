# @raytonx/config

Configuration module for NestJS applications.

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

With `envFilePath: "auto"`, the module resolves files from the current working directory
using this order:

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

Use `values` for explicit overrides:

```ts
ConfigModule.forRoot({
  envFilePath: "auto",
  values: {
    APP_NAME: "api",
  },
});
```

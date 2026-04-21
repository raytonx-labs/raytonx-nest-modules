# @raytonx/config

Configuration module for NestJS applications.

## Quick Start

```ts
import { ConfigModule, ConfigService } from "@raytonx/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      values: {
        appName: "api",
      },
    }),
  ],
})
export class AppModule {}
```

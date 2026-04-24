# @raytonx/nest-redis

Redis infrastructure module for NestJS applications.

Chinese version: [README.md](README.md)

## Installation

```bash
pnpm add @raytonx/nest-redis ioredis
```

```bash
npm i @raytonx/nest-redis ioredis
```

```bash
yarn add @raytonx/nest-redis ioredis
```

## Scope

This package only provides:

- Redis connection management
- Redis client injection and reuse
- Redis distributed locking

## Quick Start

```ts
import { Module } from "@nestjs/common";
import { RedisModule } from "@raytonx/nest-redis";

@Module({
  imports: [
    RedisModule.forRoot({
      isGlobal: true,
      connections: [
        {
          host: "127.0.0.1",
          port: 6379,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Multiple Connections

```ts
RedisModule.forRoot({
  connections: [
    {
      host: "127.0.0.1",
      name: "default",
      port: 6379,
    },
    {
      host: "127.0.0.1",
      name: "analytics",
      port: 6380,
    },
  ],
});
```

If `name` is omitted, the connection is treated as `default`. Connection names must be unique.

## Injecting Redis Clients

Inject the default client directly:

```ts
import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@raytonx/nest-redis";
import type Redis from "ioredis";

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
}
```

Inject a named client:

```ts
import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@raytonx/nest-redis";
import type Redis from "ioredis";

@Injectable()
export class AnalyticsService {
  constructor(@InjectRedis("analytics") private readonly redis: Redis) {}
}
```

Or use `RedisService`:

```ts
import { Injectable } from "@nestjs/common";
import { RedisService } from "@raytonx/nest-redis";

@Injectable()
export class QueueService {
  constructor(private readonly redisService: RedisService) {}

  async ping(): Promise<string> {
    return this.redisService.getClient().ping();
  }
}
```

## forRootAsync

```ts
import { RedisModule } from "@raytonx/nest-redis";

RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connections: [
      {
        host: config.getOrThrow("REDIS_HOST"),
        port: Number(config.getOrThrow("REDIS_PORT")),
      },
      {
        host: config.getOrThrow("ANALYTICS_REDIS_HOST"),
        name: "analytics",
        port: Number(config.getOrThrow("ANALYTICS_REDIS_PORT")),
      },
    ],
  }),
  connectionNames: ["default", "analytics"],
});
```

When you use `forRootAsync` and want to inject named clients through `@InjectRedis("name")`,
declare `connectionNames` so Nest can export those tokens up front. `RedisService.getClient(name)`
does not have this limitation.

## Distributed Locking

```ts
import { Injectable } from "@nestjs/common";
import { RedisLockService } from "@raytonx/nest-redis";

@Injectable()
export class JobsService {
  constructor(private readonly redisLockService: RedisLockService) {}

  runDailyJob(): Promise<void> {
    return this.redisLockService.runWithLock("jobs:daily-report", async () => {
      // do work
    });
  }
}
```

Default behavior:

- uses `SET key token NX PX ttl` to acquire locks
- validates the token before releasing a lock
- enables automatic lock extension in `runWithLock`
- prefixes lock keys with `lock:`

## Lock Configuration

```ts
RedisModule.forRoot({
  connections: [
    {
      host: "127.0.0.1",
      port: 6379,
    },
  ],
  lock: {
    connectionName: "default",
    defaultTtl: 30_000,
    retryAttempts: 20,
    retryDelay: 200,
    retryJitter: 50,
    autoExtend: true,
    extendInterval: 10_000,
  },
});
```

## Lock API

```ts
const handle = await redisLockService.acquire("jobs:sync");

await handle.extend(60_000);
await handle.release();
```

`RedisLockHandle` includes:

- `key`
- `token`
- `ttl`
- `connectionName`
- `acquiredAt`
- `release()`
- `extend(ttl?)`

## Exports

- `RedisModule`
- `RedisService`
- `RedisLockService`
- `InjectRedis(name?)`
- `getRedisToken(name?)`
- lock-related error types and option types

## Summary

- Supports `default` and named Redis connections through `connections`
- Reuses clients through `@InjectRedis()` or `RedisService`
- Provides Redis distributed locks with automatic extension through `RedisLockService`
- Does not include caching features

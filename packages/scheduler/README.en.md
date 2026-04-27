# @raytonx/nest-scheduler

Safe scheduler helpers for NestJS applications.

Chinese version: [README.md](README.md)

## Installation

```bash
pnpm add @raytonx/nest-scheduler @nestjs/schedule
```

For distributed multi-instance execution, also install:

```bash
pnpm add @raytonx/nest-redis ioredis
```

## Scope

- wrappers around `@nestjs/schedule`
- skip-on-overlap behavior for a single process
- optional Redis-based distributed execution locks

## Quick Start

```ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerModule } from "@raytonx/nest-scheduler";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SchedulerModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## Cron / Interval / Timeout

```ts
import { Injectable } from "@nestjs/common";
import { DistributedCron, DistributedInterval, DistributedTimeout } from "@raytonx/nest-scheduler";

@Injectable()
export class JobsService {
  @DistributedCron("0 * * * *")
  async syncReport(): Promise<void> {
    // do work
  }

  @DistributedInterval(10_000)
  async syncMetrics(): Promise<void> {
    // do work
  }

  @DistributedTimeout(5_000)
  async warmup(): Promise<void> {
    // do work
  }
}
```

Default behavior:

- skips a trigger when the previous run is still active
- falls back to an in-memory lock when Redis is unavailable
- prefers Redis distributed locking when Redis is available
- automatically extends Redis locks for long-running jobs

## Redis Mode

```ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RedisModule } from "@raytonx/nest-redis";
import { SchedulerModule } from "@raytonx/nest-scheduler";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      isGlobal: true,
      connections: [
        {
          host: "127.0.0.1",
          port: 6379,
        },
      ],
    }),
    SchedulerModule.forRoot({
      isGlobal: true,
      driver: "auto",
    }),
  ],
})
export class AppModule {}
```

`driver` behavior:

- `auto`: prefer Redis and fall back to `memory`
- `redis`: require Redis lock support
- `memory`: always use a process-local lock

## Configuration

```ts
SchedulerModule.forRoot({
  lock: {
    keyPrefix: "scheduler:",
    ttl: 30_000,
    retryAttempts: 0,
    retryDelay: 200,
    retryJitter: 50,
    autoExtend: true,
    extendInterval: 10_000,
  },
});
```

## Decorator Options

```ts
@DistributedCron("0 * * * *", {
  name: "report-job",
  lockKey: "jobs:report",
  driver: "redis",
  ttl: 60_000,
  skipIfLocked: true,
})
```

Supported options:

- `name`
- `lockKey`
- `driver`
- `connectionName`
- `ttl`
- `retryAttempts`
- `retryDelay`
- `retryJitter`
- `autoExtend`
- `extendInterval`
- `skipIfLocked`
- `enabled`

## Exports

- `SchedulerModule`
- `DistributedCron`
- `DistributedInterval`
- `DistributedTimeout`
- scheduler-related options, errors, and constants

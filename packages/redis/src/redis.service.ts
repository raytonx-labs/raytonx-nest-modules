import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import type Redis from "ioredis";

import { REDIS_CLIENTS, REDIS_MODULE_OPTIONS } from "./redis.constants";
import type { RedisModuleOptions } from "./redis.interfaces";
import { getRedisClientFromMap, normalizeRedisModuleOptions } from "./redis.utils";

@Injectable()
export class RedisService implements OnModuleDestroy, OnApplicationShutdown {
  private shutdownPromise?: Promise<void>;

  constructor(
    @Inject(REDIS_CLIENTS) private readonly clients: Map<string, Redis>,
    @Optional() @Inject(REDIS_MODULE_OPTIONS) options?: RedisModuleOptions,
  ) {
    if (options) {
      normalizeRedisModuleOptions(options);
    }
  }

  getClient(name?: string): Redis {
    return getRedisClientFromMap(this.clients, name);
  }

  getConnectionNames(): string[] {
    return [...this.clients.keys()];
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.shutdown();
  }

  private async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = Promise.all(
      [...this.clients.values()].map(async (client) => {
        await client.quit();
      }),
    ).then(() => undefined);

    return this.shutdownPromise;
  }
}

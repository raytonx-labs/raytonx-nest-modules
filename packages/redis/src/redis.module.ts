import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import {
  REDIS_CLIENTS,
  REDIS_LOCK_OPTIONS,
  REDIS_LOCK_SERVICE,
  REDIS_MODULE_OPTIONS,
} from "./redis.constants";
import type { RedisModuleAsyncOptions, RedisModuleOptions } from "./redis.interfaces";
import { RedisLockService } from "./redis.lock.service";
import { RedisService } from "./redis.service";
import {
  createRedisClients,
  getAsyncConnectionNames,
  getRedisClientFromMap,
  getRedisToken,
  normalizeRedisModuleOptions,
} from "./redis.utils";

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    const normalizedOptions = normalizeRedisModuleOptions(options);
    const clientRegistrations = normalizedOptions.connections.map((connection) => ({
      connectionName: connection.name ?? "default",
      token: getRedisToken(connection.name ?? "default"),
    }));
    const clientProviders = this.createClientProviders(clientRegistrations);

    const dynamicModule: DynamicModule = {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          useValue: normalizedOptions,
        },
        {
          provide: REDIS_LOCK_OPTIONS,
          useValue: normalizedOptions.lock,
        },
        {
          provide: REDIS_LOCK_SERVICE,
          useExisting: RedisLockService,
        },
        {
          provide: REDIS_CLIENTS,
          useFactory: (moduleOptions: RedisModuleOptions) => createRedisClients(moduleOptions),
          inject: [REDIS_MODULE_OPTIONS],
        },
        ...clientProviders,
        RedisService,
        RedisLockService,
      ],
      exports: [
        RedisService,
        RedisLockService,
        REDIS_LOCK_SERVICE,
        ...clientRegistrations.map((registration) => registration.token),
      ],
    };

    const isGlobal = normalizedOptions.isGlobal ?? normalizedOptions.global;

    if (isGlobal !== undefined) {
      dynamicModule.global = isGlobal;
    }

    return dynamicModule;
  }

  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const clientRegistrations = getAsyncConnectionNames(options.connectionNames).map(
      (connectionName) => ({
        connectionName,
        token: getRedisToken(connectionName),
      }),
    );
    const clientProviders = this.createClientProviders(clientRegistrations);
    const dynamicModule: DynamicModule = {
      module: RedisModule,
      providers: [
        this.createAsyncOptionsProvider(options),
        {
          provide: REDIS_LOCK_OPTIONS,
          useFactory: (moduleOptions: RedisModuleOptions) =>
            normalizeRedisModuleOptions(moduleOptions).lock,
          inject: [REDIS_MODULE_OPTIONS],
        },
        {
          provide: REDIS_LOCK_SERVICE,
          useExisting: RedisLockService,
        },
        {
          provide: REDIS_CLIENTS,
          useFactory: (moduleOptions: RedisModuleOptions) => createRedisClients(moduleOptions),
          inject: [REDIS_MODULE_OPTIONS],
        },
        ...this.createAsyncProviders(options),
        ...clientProviders,
        RedisService,
        RedisLockService,
      ],
      exports: [
        RedisService,
        RedisLockService,
        REDIS_LOCK_SERVICE,
        ...clientRegistrations.map((registration) => registration.token),
      ],
    };

    const isGlobal = options.isGlobal ?? options.global;

    if (isGlobal !== undefined) {
      dynamicModule.global = isGlobal;
    }

    if (options.imports !== undefined) {
      dynamicModule.imports = options.imports;
    }

    return dynamicModule;
  }

  private static createClientProviders(
    clientRegistrations: Array<{
      connectionName: string;
      token: string;
    }>,
  ): Provider[] {
    return clientRegistrations.map((registration) => ({
      provide: registration.token,
      useFactory: (clients: ReturnType<typeof createRedisClients>) =>
        getRedisClientFromMap(clients, registration.connectionName),
      inject: [REDIS_CLIENTS],
    }));
  }

  private static createAsyncProviders(options: RedisModuleAsyncOptions): Provider[] {
    if (!options.useClass) {
      return [];
    }

    return [
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: RedisModuleAsyncOptions): Provider {
    const useFactory = options.useFactory;

    if (useFactory) {
      return {
        provide: REDIS_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) =>
          normalizeRedisModuleOptions(await useFactory(...args)),
        inject: options.inject ?? [],
      };
    }

    const optionsFactory = options.useExisting ?? options.useClass;

    if (!optionsFactory) {
      throw new Error("RedisModule.forRootAsync requires useFactory, useClass, or useExisting.");
    }

    return {
      provide: REDIS_MODULE_OPTIONS,
      useFactory: async (factory: {
        createModuleOptions: () => RedisModuleOptions | Promise<RedisModuleOptions>;
      }) => normalizeRedisModuleOptions(await factory.createModuleOptions()),
      inject: [optionsFactory],
    };
  }
}

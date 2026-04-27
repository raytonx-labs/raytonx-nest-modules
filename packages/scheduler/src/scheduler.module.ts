import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import { SCHEDULER_MODULE_OPTIONS } from "./scheduler.constants";
import { SchedulerDiscoveryService } from "./scheduler.discovery";
import { SchedulerExecutionService } from "./scheduler.execution.service";
import type { SchedulerModuleAsyncOptions, SchedulerModuleOptions } from "./scheduler.interfaces";
import { normalizeSchedulerModuleOptions } from "./scheduler.utils";

@Module({})
export class SchedulerModule {
  static forRoot(options: SchedulerModuleOptions = {}): DynamicModule {
    const normalizedOptions = normalizeSchedulerModuleOptions(options);
    const dynamicModule: DynamicModule = {
      module: SchedulerModule,
      providers: [
        {
          provide: SCHEDULER_MODULE_OPTIONS,
          useValue: normalizedOptions,
        },
        SchedulerExecutionService,
        SchedulerDiscoveryService,
      ],
    };
    const isGlobal = normalizedOptions.isGlobal ?? normalizedOptions.global;

    if (isGlobal !== undefined) {
      dynamicModule.global = isGlobal;
    }

    return dynamicModule;
  }

  static forRootAsync(options: SchedulerModuleAsyncOptions): DynamicModule {
    const dynamicModule: DynamicModule = {
      module: SchedulerModule,
      providers: [
        this.createAsyncOptionsProvider(options),
        ...this.createAsyncProviders(options),
        SchedulerExecutionService,
        SchedulerDiscoveryService,
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

  private static createAsyncProviders(options: SchedulerModuleAsyncOptions): Provider[] {
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

  private static createAsyncOptionsProvider(options: SchedulerModuleAsyncOptions): Provider {
    const useFactory = options.useFactory;

    if (useFactory) {
      return {
        provide: SCHEDULER_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) =>
          normalizeSchedulerModuleOptions(await useFactory(...args)),
        inject: options.inject ?? [],
      };
    }

    const optionsFactory = options.useExisting ?? options.useClass;

    if (!optionsFactory) {
      throw new Error(
        "SchedulerModule.forRootAsync requires useFactory, useClass, or useExisting.",
      );
    }

    return {
      provide: SCHEDULER_MODULE_OPTIONS,
      useFactory: async (factory: {
        createModuleOptions: () => SchedulerModuleOptions | Promise<SchedulerModuleOptions>;
      }) => normalizeSchedulerModuleOptions(await factory.createModuleOptions()),
      inject: [optionsFactory],
    };
  }
}

import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import { CONFIG_MODULE_OPTIONS } from "./config.constants";
import type {
  ConfigModuleAsyncOptions,
  ConfigModuleOptions,
  ConfigValues,
} from "./config.interfaces";
import { loadConfig } from "./config.loader";
import { ConfigService } from "./config.service";

@Module({})
export class ConfigModule {
  static forRoot<TValues extends ConfigValues = ConfigValues>(
    options: ConfigModuleOptions<TValues> = {},
  ): DynamicModule {
    const dynamicModule: DynamicModule = {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_MODULE_OPTIONS,
          useValue: {
            ...options,
            values: loadConfig(options).values,
          },
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };

    const isGlobal = options.isGlobal ?? options.global;

    if (isGlobal !== undefined) {
      dynamicModule.global = isGlobal;
    }

    return dynamicModule;
  }

  static forRootAsync<TValues extends ConfigValues = ConfigValues>(
    options: ConfigModuleAsyncOptions<TValues>,
  ): DynamicModule {
    const asyncOptionsProvider = this.createAsyncOptionsProvider(options);
    const asyncProviders = this.createAsyncProviders(options);

    const dynamicModule: DynamicModule = {
      module: ConfigModule,
      providers: [...asyncProviders, asyncOptionsProvider, ConfigService],
      exports: [ConfigService],
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

  private static createAsyncProviders<TValues extends ConfigValues>(
    options: ConfigModuleAsyncOptions<TValues>,
  ): Provider[] {
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

  private static createAsyncOptionsProvider<TValues extends ConfigValues>(
    options: ConfigModuleAsyncOptions<TValues>,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: CONFIG_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory?.(...args);

          return {
            ...moduleOptions,
            values: loadConfig(moduleOptions).values,
          };
        },
        inject: options.inject ?? [],
      };
    }

    const optionsFactory = options.useExisting ?? options.useClass;

    if (!optionsFactory) {
      throw new Error("ConfigModule.forRootAsync requires useFactory, useClass, or useExisting.");
    }

    return {
      provide: CONFIG_MODULE_OPTIONS,
      useFactory: async (factory: {
        createModuleOptions: () => ConfigModuleOptions | Promise<ConfigModuleOptions>;
      }) => {
        const moduleOptions = await factory.createModuleOptions();

        return {
          ...moduleOptions,
          values: loadConfig(moduleOptions).values,
        };
      },
      inject: [optionsFactory],
    };
  }
}

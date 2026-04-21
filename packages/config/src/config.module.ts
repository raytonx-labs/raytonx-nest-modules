import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import { CONFIG_MODULE_OPTIONS } from "./config.constants";
import type {
  ConfigModuleAsyncOptions,
  ConfigModuleOptions,
  ConfigValues,
} from "./config.interfaces";
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
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };

    if (options.global !== undefined) {
      dynamicModule.global = options.global;
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
        useFactory: options.useFactory,
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
      }) => factory.createModuleOptions(),
      inject: [optionsFactory],
    };
  }
}

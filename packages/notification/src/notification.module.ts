import { type DynamicModule, Module, type Provider } from "@nestjs/common";
import { Resend } from "resend";

import { NOTIFICATION_CLIENT, NOTIFICATION_MODULE_OPTIONS } from "./notification.constants";
import type {
  NormalizedNotificationModuleOptions,
  NotificationClientLike,
  NotificationModuleAsyncOptions,
  NotificationModuleOptions,
} from "./notification.interfaces";
import { NotificationService } from "./notification.service";

@Module({})
export class NotificationModule {
  static forRoot(options: NotificationModuleOptions): DynamicModule {
    const normalizedOptions = this.normalizeOptions(options);
    const dynamicModule: DynamicModule = {
      module: NotificationModule,
      providers: [
        {
          provide: NOTIFICATION_MODULE_OPTIONS,
          useValue: normalizedOptions,
        },
        this.createClientProvider(),
        NotificationService,
      ],
      exports: [NOTIFICATION_MODULE_OPTIONS, NOTIFICATION_CLIENT, NotificationService],
    };
    const isGlobal = normalizedOptions.isGlobal ?? normalizedOptions.global;

    if (isGlobal !== undefined) {
      dynamicModule.global = isGlobal;
    }

    return dynamicModule;
  }

  static forRootAsync(options: NotificationModuleAsyncOptions): DynamicModule {
    const dynamicModule: DynamicModule = {
      module: NotificationModule,
      providers: [
        this.createAsyncOptionsProvider(options),
        ...this.createAsyncProviders(options),
        this.createClientProvider(),
        NotificationService,
      ],
      exports: [NOTIFICATION_MODULE_OPTIONS, NOTIFICATION_CLIENT, NotificationService],
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

  private static createAsyncProviders(options: NotificationModuleAsyncOptions): Provider[] {
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

  private static createAsyncOptionsProvider(options: NotificationModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: NOTIFICATION_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) =>
          this.normalizeOptions(await options.useFactory!(...args)),
        inject: options.inject ?? [],
      };
    }

    const optionsFactory = options.useExisting ?? options.useClass;

    if (!optionsFactory) {
      throw new Error(
        "NotificationModule.forRootAsync requires useFactory, useClass, or useExisting.",
      );
    }

    return {
      provide: NOTIFICATION_MODULE_OPTIONS,
      useFactory: async (factory: {
        createModuleOptions: () => NotificationModuleOptions | Promise<NotificationModuleOptions>;
      }) => this.normalizeOptions(await factory.createModuleOptions()),
      inject: [optionsFactory],
    };
  }

  private static createClientProvider(): Provider {
    return {
      provide: NOTIFICATION_CLIENT,
      useFactory: (options: NormalizedNotificationModuleOptions): NotificationClientLike =>
        new Resend(options.apiKey) as NotificationClientLike,
      inject: [NOTIFICATION_MODULE_OPTIONS],
    };
  }

  private static normalizeOptions(
    options: NotificationModuleOptions,
  ): NormalizedNotificationModuleOptions {
    const normalizedOptions: NormalizedNotificationModuleOptions = {
      apiKey: options.apiKey,
      defaultFrom: options.defaultFrom,
      global: options.global ?? false,
      isGlobal: options.isGlobal ?? options.global ?? false,
    };

    return normalizedOptions;
  }
}

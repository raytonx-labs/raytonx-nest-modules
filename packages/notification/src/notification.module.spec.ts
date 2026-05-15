import { describe, expect, it } from "vitest";

import { NOTIFICATION_CLIENT, NOTIFICATION_MODULE_OPTIONS } from "./notification.constants";
import type { NotificationModuleOptions } from "./notification.interfaces";
import { NotificationModule } from "./notification.module";
import { NotificationService } from "./notification.service";

describe("NotificationModule", () => {
  it("maps isGlobal to the Nest dynamic module global option", () => {
    const dynamicModule = NotificationModule.forRoot({
      apiKey: "re_test",
      isGlobal: true,
    });

    expect(dynamicModule.global).toBe(true);
  });

  it("provides normalized notification module options", () => {
    const dynamicModule = NotificationModule.forRoot({
      apiKey: "re_test",
      defaultFrom: "RaytonX <noreply@example.com>",
    });

    expect(dynamicModule.providers).toContainEqual({
      provide: NOTIFICATION_MODULE_OPTIONS,
      useValue: {
        apiKey: "re_test",
        defaultFrom: "RaytonX <noreply@example.com>",
        global: false,
        isGlobal: false,
      },
    });
    expect(dynamicModule.providers).toContainEqual(
      expect.objectContaining({
        provide: NOTIFICATION_CLIENT,
      }),
    );
    expect(dynamicModule.providers).toContain(NotificationService);
    expect(dynamicModule.exports).toContain(NotificationService);
  });

  it("supports async factory options", async () => {
    const dynamicModule = NotificationModule.forRootAsync({
      isGlobal: true,
      useFactory: async (): Promise<NotificationModuleOptions> => ({
        apiKey: "re_async",
      }),
    });
    const asyncProvider = dynamicModule.providers?.find(
      (provider: unknown) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === NOTIFICATION_MODULE_OPTIONS,
    ) as {
      useFactory: () => Promise<unknown>;
    };
    const options = await asyncProvider.useFactory();

    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toContain(NotificationService);
    expect(options).toEqual({
      apiKey: "re_async",
      defaultFrom: undefined,
      global: false,
      isGlobal: false,
    });
  });

  it("supports useClass and useExisting async options", async () => {
    class OptionsFactory {
      createModuleOptions(): NotificationModuleOptions {
        return {
          apiKey: "re_class",
          defaultFrom: "class@example.com",
        };
      }
    }

    const withUseClass = NotificationModule.forRootAsync({
      useClass: OptionsFactory,
    });
    const useClassProvider = withUseClass.providers?.find(
      (provider: unknown) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === NOTIFICATION_MODULE_OPTIONS,
    ) as {
      useFactory: (factory: OptionsFactory) => Promise<unknown>;
    };
    const fromUseClass = await useClassProvider.useFactory(new OptionsFactory());

    expect(withUseClass.providers).toContainEqual({
      provide: OptionsFactory,
      useClass: OptionsFactory,
    });
    expect(fromUseClass).toEqual({
      apiKey: "re_class",
      defaultFrom: "class@example.com",
      global: false,
      isGlobal: false,
    });

    const withUseExisting = NotificationModule.forRootAsync({
      useExisting: OptionsFactory,
    });
    const useExistingProvider = withUseExisting.providers?.find(
      (provider: unknown) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === NOTIFICATION_MODULE_OPTIONS,
    ) as {
      inject: unknown[];
    };

    expect(useExistingProvider.inject).toEqual([OptionsFactory]);
  });

  it("requires an async options source", () => {
    expect(() => NotificationModule.forRootAsync({})).toThrow(
      "NotificationModule.forRootAsync requires useFactory, useClass, or useExisting.",
    );
  });
});

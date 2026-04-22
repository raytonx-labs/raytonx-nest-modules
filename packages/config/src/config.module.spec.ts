import { describe, expect, it } from "vitest";
import { z } from "zod";

import { CONFIG_MODULE_OPTIONS } from "./config.constants";
import { ConfigModule } from "./config.module";

describe("ConfigModule", () => {
  it("maps isGlobal to the Nest dynamic module global option", () => {
    const dynamicModule = ConfigModule.forRoot({
      isGlobal: true,
    });

    expect(dynamicModule.global).toBe(true);
  });

  it("provides resolved config options", () => {
    const dynamicModule = ConfigModule.forRoot({
      values: {
        appName: "api",
      },
    });

    expect(dynamicModule.providers).toContainEqual({
      provide: CONFIG_MODULE_OPTIONS,
      useValue: {
        values: expect.objectContaining({
          appName: "api",
        }),
      },
    });
  });

  it("provides schema-validated config options", () => {
    const dynamicModule = ConfigModule.forRoot({
      values: {
        PORT: 3000,
      },
      schema: z.object({
        PORT: z.coerce.number(),
      }),
    });

    expect(dynamicModule.providers).toContainEqual({
      provide: CONFIG_MODULE_OPTIONS,
      useValue: {
        schema: expect.any(Object),
        values: expect.objectContaining({
          PORT: 3000,
        }),
      },
    });
  });
});

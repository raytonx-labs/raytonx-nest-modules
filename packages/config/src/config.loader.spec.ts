import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { ConfigValidationError } from "./config.errors";
import { loadConfig, resolveEnvFilePaths } from "./config.loader";

describe("config loader", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPort = process.env.PORT;
  const originalAppUrl = process.env.APP_URL;
  const tempDirs: string[] = [];

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    restoreProcessEnv("PORT", originalPort);
    restoreProcessEnv("APP_URL", originalAppUrl);

    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });

  it("resolves automatic env file paths from NODE_ENV", () => {
    process.env.NODE_ENV = "test";

    expect(resolveEnvFilePaths("auto", "/app")).toEqual([
      "/app/.env",
      "/app/.env.local",
      "/app/.env.test",
      "/app/.env.test.local",
    ]);
  });

  it("loads env files with later files overriding earlier files", () => {
    process.env.NODE_ENV = "development";
    const cwd = createTempDir();

    writeFileSync(join(cwd, ".env"), "PORT=3000\nAPP_NAME=base\n");
    writeFileSync(join(cwd, ".env.development"), "PORT=3001\n");

    const config = loadConfig({
      cwd,
      envFilePath: "auto",
    });

    expect(config.values.PORT).toBe("3001");
    expect(config.values.APP_NAME).toBe("base");
  });

  it("keeps process.env values above env file values", () => {
    process.env.PORT = "4000";
    const cwd = createTempDir();

    writeFileSync(join(cwd, ".env"), "PORT=3000\n");

    const config = loadConfig({
      cwd,
      envFilePath: ".env",
    });

    expect(config.values.PORT).toBe("4000");
  });

  it("expands variables from env files", () => {
    const cwd = createTempDir();

    writeFileSync(
      join(cwd, ".env"),
      "APP_HOST=localhost\nAPP_PORT=3000\nAPP_URL=http://${APP_HOST}:${APP_PORT}\n",
    );

    const config = loadConfig({
      cwd,
      envFilePath: ".env",
    });

    expect(config.values.APP_URL).toBe("http://localhost:3000");
  });

  it("validates and transforms config with a zod schema", () => {
    const cwd = createTempDir();

    writeFileSync(join(cwd, ".env"), "PORT=3000\n");

    const config = loadConfig({
      cwd,
      envFilePath: ".env",
      schema: z.object({
        PORT: z.coerce.number(),
      }),
    });

    expect(config.values.PORT).toBe(3000);
  });

  it("throws a readable error when schema validation fails", () => {
    const cwd = createTempDir();

    writeFileSync(join(cwd, ".env"), "PORT=not-a-number\n");

    expect(() =>
      loadConfig({
        cwd,
        envFilePath: ".env",
        schema: z.object({
          PORT: z.coerce.number(),
        }),
      }),
    ).toThrow(ConfigValidationError);

    expect(() =>
      loadConfig({
        cwd,
        envFilePath: ".env",
        schema: z.object({
          PORT: z.coerce.number(),
        }),
      }),
    ).toThrow("PORT:");
  });

  function createTempDir(): string {
    const tempDir = mkdtempSync(join(tmpdir(), "raytonx-config-"));
    tempDirs.push(tempDir);

    return tempDir;
  }

  function restoreProcessEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  }
});

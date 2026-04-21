import { describe, expect, it } from "vitest";
import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  it("returns configured values", () => {
    const service = new ConfigService({
      values: {
        appName: "api"
      }
    });

    expect(service.get("appName")).toBe("api");
  });

  it("throws when a required value is missing", () => {
    const service = new ConfigService();

    expect(() => service.getOrThrow("missing")).toThrow("Missing required config value: missing");
  });
});


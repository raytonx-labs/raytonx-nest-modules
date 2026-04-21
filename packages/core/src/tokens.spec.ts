import { describe, expect, it } from "vitest";

import { createInjectionToken } from "./tokens";

describe("createInjectionToken", () => {
  it("creates a namespaced token", () => {
    expect(createInjectionToken("@raytonx/config", "options")).toBe("@raytonx/config:options");
  });
});

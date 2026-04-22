import type { ZodError } from "zod";

export class ConfigValidationError extends Error {
  readonly issues: ZodError["issues"];

  constructor(error: ZodError) {
    super(formatZodError(error));
    this.name = "ConfigValidationError";
    this.issues = error.issues;
  }
}

function formatZodError(error: ZodError): string {
  const issues = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";

      return `${path}: ${issue.message}`;
    })
    .join("\n");

  return `Invalid configuration:\n${issues}`;
}

export class NotificationSendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "NotificationSendError";

    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }

  declare cause?: unknown;
}

import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationSendError } from "./notification.errors";
import type {
  NormalizedNotificationModuleOptions,
  NotificationClientLike,
} from "./notification.interfaces";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let client: NotificationClientLike;
  let options: NormalizedNotificationModuleOptions;
  let service: NotificationService;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn();
    send.mockResolvedValue({
      data: {
        id: "email_123",
      },
      error: null,
    });
    client = {
      emails: {
        send: send as NotificationClientLike["emails"]["send"],
      },
    };
    options = {
      apiKey: "re_test",
      defaultFrom: "RaytonX <noreply@example.com>",
      global: false,
      isGlobal: false,
    };
    service = new NotificationService(options, client);
  });

  it("sends html-only emails", async () => {
    await expect(
      service.sendEmail({
        to: "user@example.com",
        subject: "Welcome",
        html: "<p>Hello</p>",
      }),
    ).resolves.toEqual({
      id: "email_123",
    });

    expect(send).toHaveBeenCalledWith({
      from: "RaytonX <noreply@example.com>",
      html: "<p>Hello</p>",
      subject: "Welcome",
      to: ["user@example.com"],
    });
  });

  it("sends text-only emails", async () => {
    await expect(
      service.sendEmail({
        to: ["user@example.com"],
        subject: "Hello",
        text: "Plain text",
      }),
    ).resolves.toEqual({
      id: "email_123",
    });

    expect(send).toHaveBeenCalledWith({
      from: "RaytonX <noreply@example.com>",
      subject: "Hello",
      text: "Plain text",
      to: ["user@example.com"],
    });
  });

  it("prefers the input from over the defaultFrom option", async () => {
    await service.sendEmail({
      from: {
        email: "sender@example.com",
        name: "Sender",
      },
      to: "user@example.com",
      subject: "Hello",
      text: "Plain text",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Sender <sender@example.com>",
      }),
    );
  });

  it("normalizes to, cc, bcc, replyTo, and tags", async () => {
    await service.sendEmail({
      from: {
        email: "sender@example.com",
        name: "Sender",
      },
      to: [{ email: "user1@example.com", name: "User One" }, "user2@example.com"],
      cc: "copy@example.com",
      bcc: [{ email: "hidden@example.com", name: "Hidden User" }],
      replyTo: {
        email: "reply@example.com",
        name: "Reply Team",
      },
      subject: "Hello",
      text: "Plain text",
      tags: [
        {
          name: "category",
          value: "welcome",
        },
      ],
    });

    expect(send).toHaveBeenCalledWith({
      bcc: ["Hidden User <hidden@example.com>"],
      cc: ["copy@example.com"],
      from: "Sender <sender@example.com>",
      replyTo: "Reply Team <reply@example.com>",
      subject: "Hello",
      tags: [
        {
          name: "category",
          value: "welcome",
        },
      ],
      text: "Plain text",
      to: ["User One <user1@example.com>", "user2@example.com"],
    });
  });

  it("falls back to the module defaultFrom option", async () => {
    await service.sendEmail({
      to: "user@example.com",
      subject: "Default sender",
      text: "Plain text",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "RaytonX <noreply@example.com>",
      }),
    );
  });

  it("throws when from is missing from both input and module options", async () => {
    service = new NotificationService(
      {
        ...options,
        defaultFrom: undefined,
      },
      client,
    );

    await expect(
      service.sendEmail({
        to: "user@example.com",
        subject: "Missing from",
        text: "Plain text",
      }),
    ).rejects.toThrow(NotificationSendError);
  });

  it("throws when text and html are both missing", async () => {
    await expect(
      service.sendEmail({
        to: "user@example.com",
        subject: "Missing body",
      }),
    ).rejects.toThrow("Either text or html content is required.");
  });

  it("wraps resend error responses", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Provider rejected request.",
      },
    });

    await expect(
      service.sendEmail({
        to: "user@example.com",
        subject: "Failure",
        text: "Plain text",
      }),
    ).rejects.toThrow("Provider rejected request.");
  });

  it("wraps resend exceptions", async () => {
    send.mockRejectedValueOnce(new Error("network down"));

    await expect(
      service.sendEmail({
        to: "user@example.com",
        subject: "Failure",
        text: "Plain text",
      }),
    ).rejects.toThrow("Failed to send email.");
  });
});

# @raytonx/nest-notification

Notification module for NestJS applications with built-in Resend email delivery.

Chinese version: [README.md](README.md)

## Installation

```bash
pnpm add @raytonx/nest-notification resend
```

## Scope

- Send emails through a unified `NotificationService`
- Deliver raw email payloads through the Resend API
- Support `forRoot` / `forRootAsync` dynamic module registration
- Support a module-level default sender

## Quick Start

```ts
import { Module } from "@nestjs/common";
import { NotificationModule } from "@raytonx/nest-notification";

@Module({
  imports: [
    NotificationModule.forRoot({
      isGlobal: true,
      apiKey: process.env.RESEND_API_KEY!,
      defaultFrom: "RaytonX <noreply@example.com>",
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from "@nestjs/common";
import { NotificationService } from "@raytonx/nest-notification";

@Injectable()
export class WelcomeService {
  constructor(private readonly notificationService: NotificationService) {}

  async sendWelcomeEmail(): Promise<void> {
    await this.notificationService.sendEmail({
      to: "user@example.com",
      subject: "Welcome",
      html: "<p>Hello from RaytonX</p>",
    });
  }
}
```

## Module Options

```ts
NotificationModule.forRoot({
  isGlobal: true,
  apiKey: process.env.RESEND_API_KEY!,
  defaultFrom: "RaytonX <noreply@example.com>",
});
```

Supported options:

- `global`
- `isGlobal`
- `apiKey`
- `defaultFrom`

Behavior:

- `apiKey` is required and used to create the Resend client
- `defaultFrom` is optional and used when `sendEmail()` does not receive `from`
- `global` and `isGlobal` follow the same behavior as the other dynamic modules in this repo

## sendEmail

```ts
await notificationService.sendEmail({
  from: {
    email: "sender@example.com",
    name: "Sender",
  },
  to: [{ email: "user@example.com", name: "User" }],
  cc: "copy@example.com",
  bcc: "hidden@example.com",
  replyTo: "reply@example.com",
  subject: "Welcome",
  html: "<p>Hello</p>",
  text: "Hello",
  tags: [
    {
      name: "category",
      value: "welcome",
    },
  ],
});
```

Input rules:

- `subject` is required
- at least one of `text` or `html` is required
- `from` falls back to the module-level `defaultFrom`
- the service throws `NotificationSendError` when both `from` and `defaultFrom` are missing
- `to` accepts a single address or an array
- addresses can be strings or `{ email, name }` objects

The Resend Node SDK currently supports `replyTo` and `tags`, and this module forwards both fields directly to the send request. Sources:

- [Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Managing Tags](https://resend.com/docs/dashboard/emails/tags)

## Async Registration

```ts
NotificationModule.forRootAsync({
  useFactory: async () => ({
    isGlobal: true,
    apiKey: process.env.RESEND_API_KEY!,
    defaultFrom: "RaytonX <noreply@example.com>",
  }),
});
```

## Exports

- `NotificationModule`
- `NotificationService`
- `NOTIFICATION_MODULE_OPTIONS`
- `NOTIFICATION_CLIENT`
- `NotificationModuleOptions`
- `NotificationModuleAsyncOptions`
- `NotificationAddress`
- `SendEmailInput`
- `SendEmailResult`
- `NotificationSendError`

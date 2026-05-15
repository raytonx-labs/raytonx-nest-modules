# @raytonx/nest-notification

用于 NestJS 应用的通知模块，内置 Resend 邮件发送能力。

English version: [README.en.md](README.en.md)

## 安装

```bash
pnpm add @raytonx/nest-notification resend
```

## 功能边界

- 通过 `NotificationService` 统一发送邮件
- 基于 Resend API 发送原始邮件内容
- 支持 `forRoot` / `forRootAsync` 动态模块注册
- 支持模块级默认发件人配置

## 快速开始

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

## 模块选项

```ts
NotificationModule.forRoot({
  isGlobal: true,
  apiKey: process.env.RESEND_API_KEY!,
  defaultFrom: "RaytonX <noreply@example.com>",
});
```

支持：

- `global`
- `isGlobal`
- `apiKey`
- `defaultFrom`

说明：

- `apiKey` 必填，用于实例化 Resend 客户端
- `defaultFrom` 可选；当 `sendEmail()` 未传 `from` 时会回退到这里
- `global` 与 `isGlobal` 的行为与仓库内其他动态模块保持一致

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

输入约束：

- `subject` 必填
- `text` 与 `html` 至少提供一个
- `from` 未传时，回退到模块级 `defaultFrom`
- 如果 `from` 与 `defaultFrom` 都为空，会抛出 `NotificationSendError`
- `to` 支持单个地址或地址数组
- 地址既支持字符串，也支持 `{ email, name }`

Resend Node SDK 当前支持 `replyTo` 与 `tags` 字段，模块会直接透传这两类参数到邮件发送请求中。来源参考 Resend 官方文档：

- [Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Managing Tags](https://resend.com/docs/dashboard/emails/tags)

## 异步注册

```ts
NotificationModule.forRootAsync({
  useFactory: async () => ({
    isGlobal: true,
    apiKey: process.env.RESEND_API_KEY!,
    defaultFrom: "RaytonX <noreply@example.com>",
  }),
});
```

## 导出内容

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

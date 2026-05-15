import { Inject, Injectable } from "@nestjs/common";

import { NOTIFICATION_CLIENT, NOTIFICATION_MODULE_OPTIONS } from "./notification.constants";
import { NotificationSendError } from "./notification.errors";
import type {
  NormalizedNotificationModuleOptions,
  NotificationAddress,
  NotificationAddressLike,
  NotificationAddressList,
  NotificationClientLike,
  ResendSendEmailPayload,
  SendEmailInput,
  SendEmailResult,
} from "./notification.interfaces";

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_MODULE_OPTIONS)
    private readonly options: NormalizedNotificationModuleOptions,
    @Inject(NOTIFICATION_CLIENT)
    private readonly client: NotificationClientLike,
  ) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const payload = this.createPayload(input);

    try {
      const response = await this.client.emails.send(payload);

      if (response.error) {
        throw new NotificationSendError(response.error.message ?? "Failed to send email.", {
          cause: response.error,
        });
      }

      const id = response.data?.id;

      if (!id) {
        throw new NotificationSendError("Resend did not return an email id.");
      }

      return {
        id,
      };
    } catch (error) {
      if (error instanceof NotificationSendError) {
        throw error;
      }

      throw new NotificationSendError("Failed to send email.", {
        cause: error,
      });
    }
  }

  private createPayload(input: SendEmailInput): ResendSendEmailPayload {
    const subject = input.subject.trim();

    if (!subject) {
      throw new NotificationSendError("Email subject is required.");
    }

    if (!input.text && !input.html) {
      throw new NotificationSendError("Either text or html content is required.");
    }

    const from = input.from ?? this.options.defaultFrom;

    if (!from) {
      throw new NotificationSendError("Email from address is required.");
    }

    const payload: ResendSendEmailPayload = {
      from: this.formatAddress(from),
      subject,
      to: this.normalizeAddressList(input.to, "to"),
    };

    if (input.cc !== undefined) {
      payload.cc = this.normalizeAddressList(input.cc, "cc");
    }

    if (input.bcc !== undefined) {
      payload.bcc = this.normalizeAddressList(input.bcc, "bcc");
    }

    if (input.replyTo !== undefined) {
      payload.replyTo = this.formatAddress(input.replyTo);
    }

    if (input.text !== undefined) {
      payload.text = input.text;
    }

    if (input.html !== undefined) {
      payload.html = input.html;
    }

    if (input.tags !== undefined) {
      payload.tags = input.tags;
    }

    return payload;
  }

  private normalizeAddressList(value: NotificationAddressList, fieldName: string): string[] {
    const items = Array.isArray(value) ? value : [value];

    if (items.length === 0) {
      throw new NotificationSendError(`Email ${fieldName} address is required.`);
    }

    return items.map((item, index) => {
      try {
        return this.formatAddress(item);
      } catch (error) {
        throw new NotificationSendError(`Invalid email ${fieldName} address at index ${index}.`, {
          cause: error,
        });
      }
    });
  }

  private formatAddress(value: NotificationAddressLike): string {
    if (typeof value === "string") {
      const address = value.trim();

      if (!address) {
        throw new NotificationSendError("Email address cannot be empty.");
      }

      return address;
    }

    return this.formatNamedAddress(value);
  }

  private formatNamedAddress(value: NotificationAddress): string {
    const email = value.email.trim();

    if (!email) {
      throw new NotificationSendError("Email address cannot be empty.");
    }

    const name = value.name?.trim();

    if (!name) {
      return email;
    }

    return `${name} <${email}>`;
  }
}

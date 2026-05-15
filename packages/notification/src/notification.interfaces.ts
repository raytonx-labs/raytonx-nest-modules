import type { AsyncModuleOptions } from "@raytonx/core";

export interface NotificationAddress {
  email: string;
  name?: string;
}

export interface NotificationTag {
  name: string;
  value: string;
}

export type NotificationAddressLike = NotificationAddress | string;
export type NotificationAddressList = NotificationAddressLike | NotificationAddressLike[];

export interface SendEmailInput {
  from?: NotificationAddressLike;
  to: NotificationAddressList;
  cc?: NotificationAddressList;
  bcc?: NotificationAddressList;
  replyTo?: NotificationAddressLike;
  subject: string;
  text?: string;
  html?: string;
  tags?: NotificationTag[];
}

export interface SendEmailResult {
  id: string;
}

export interface NotificationModuleOptions {
  global?: boolean;
  isGlobal?: boolean;
  apiKey: string;
  defaultFrom?: NotificationAddressLike;
}

export type NotificationModuleAsyncOptions = AsyncModuleOptions<NotificationModuleOptions> &
  Pick<NotificationModuleOptions, "global" | "isGlobal">;

export interface NormalizedNotificationModuleOptions {
  apiKey: string;
  defaultFrom: NotificationAddressLike | undefined;
  global: boolean;
  isGlobal: boolean;
}

export interface ResendSendEmailPayload {
  bcc?: string[];
  cc?: string[];
  from: string;
  html?: string;
  replyTo?: string;
  subject: string;
  tags?: NotificationTag[];
  text?: string;
  to: string[];
}

export interface ResendSendEmailResponse {
  data?: {
    id?: string | null;
  } | null;
  error?: {
    message?: string | null;
    name?: string | null;
  } | null;
}

export interface NotificationClientLike {
  emails: {
    send(payload: ResendSendEmailPayload): Promise<ResendSendEmailResponse>;
  };
}

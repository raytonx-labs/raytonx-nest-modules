declare module "@nestjs/schedule" {
  export interface CronOptions {
    disabled?: boolean;
    name?: string;
    timeZone?: string;
    utcOffset?: number | string;
  }

  export function Cron(cronTime: string, options?: CronOptions): MethodDecorator;
  export function Interval(timeout: number): MethodDecorator;
  export function Interval(name: string, timeout: number): MethodDecorator;
  export function Timeout(timeout: number): MethodDecorator;
  export function Timeout(name: string, timeout: number): MethodDecorator;
}

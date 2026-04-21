export function createInjectionToken(packageName: string, tokenName: string): string {
  return `${packageName}:${tokenName}`;
}


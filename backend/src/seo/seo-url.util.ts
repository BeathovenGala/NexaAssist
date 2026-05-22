/** Normalize user input into a fetchable absolute URL. */
export function normalizeAuditUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  return parsed.toString();
}

export function auditOrigin(url: string): string {
  return new URL(url).origin;
}

export function hostnameFromUrl(url: string): string {
  return new URL(url).hostname;
}

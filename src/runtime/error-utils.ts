// Redaction helpers for error payloads, ported from Umami's tracker
// (umami-software/umami v3.5.0, src/tracker/error-utils.ts, MIT). Umami runs the
// same scrubbing again on the server; doing it here keeps the data out of transit.

export function scrubErrorText(value: string, limit = 2000): string {
  return value
    .slice(0, limit)
    .replace(/https?:\/\/[^\s)]+/g, (url) => {
      try {
        const location = url.match(/:\d+:\d+$/)?.[0] || '';
        const parsed = new URL(location ? url.slice(0, -location.length) : url);
        return `${parsed.origin}${parsed.pathname}${location}`;
      }
      catch {
        return '[url]';
      }
    })
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[token]')
    .replace(
      /\b(password|secret|token|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]',
    )
    .slice(0, limit);
}

export function errorPagePath(value: string): string {
  try {
    return scrubErrorText(new URL(value, 'https://localhost').pathname, 500);
  }
  catch {
    return '/';
  }
}

export function scrubErrorTags(tags: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tags)
      .slice(0, 20)
      .filter(([key]) => !/password|secret|token|authorization|cookie|email|api.?key/i.test(key))
      .map(([key, value]) => [scrubErrorText(key, 50), scrubErrorText(String(value), 200)]),
  );
}

export function occurrenceId(): string {
  if (typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** One JSON object per line on stdout, ready for any log collector. Silent under tests. */
export function log(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

/**
 * Sends a server error to Sentry when SENTRY_DSN is set, through its plain HTTP envelope API (no SDK needed).
 * Fire and forget: a tracking outage must never break a response. Only method, path and request id leave the
 * server, never bodies or cookies.
 */
export function reportError(err: Error, context: { requestId?: string; method?: string; path?: string } = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  let url: URL;
  try { url = new URL(dsn); } catch { return; }
  const projectId = url.pathname.split('/').filter(Boolean).pop();
  if (!projectId || !url.username) return;
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    environment: process.env.NODE_ENV || 'production',
    exception: { values: [{ type: err.name, value: err.message }] },
    tags: context.requestId ? { request_id: context.requestId } : undefined,
    request: context.path ? { method: context.method, url: context.path } : undefined,
    extra: { stack: err.stack },
  };
  const body = [JSON.stringify({ event_id: eventId, dsn }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
  fetch(`${url.protocol}//${url.host}/api/${projectId}/envelope/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=shieldiq/1.0`,
    },
    body,
    signal: AbortSignal.timeout(5000),
  }).catch(() => log('warn', 'error report not sent'));
}

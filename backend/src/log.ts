/** One JSON object per line on stdout, ready for any log collector. Silent under tests. */
export function log(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

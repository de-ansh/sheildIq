import { vi } from 'vitest';

/**
 * Stubs fetch so each API path (e.g. '/plans') returns the given JSON; unknown paths return 404.
 * A route may be a function of the request init (to vary by method); returning a Response sends it as-is.
 */
export function mockApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://localhost').pathname.replace('/api/v1', '');
    if (!(path in routes)) return new Response(JSON.stringify({ success: false, error: 'not found' }), { status: 404 });
    const route = routes[path];
    const body = typeof route === 'function' ? route(init) : route;
    return body instanceof Response ? body : new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

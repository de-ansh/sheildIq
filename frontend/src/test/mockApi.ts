import { vi } from 'vitest';

/** Stubs fetch so each API path (e.g. '/plans') returns the given JSON; unknown paths return 404. */
export function mockApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname.replace('/api/v1', '');
    const body = path in routes ? routes[path] : { success: false, error: 'not found' };
    return new Response(JSON.stringify(body), { status: path in routes ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export interface Recorded {
  url: URL;
  method: string;
  headers: Headers;
  body: string | undefined;
}

export function fakeFetch(...replies: Array<Response | Error>) {
  const requests: Recorded[] = [];
  const queue = [...replies];

  const fetch = async (
    input: string | URL | Request,
    init: RequestInit = {}
  ): Promise<Response> => {
    requests.push({
      url: new URL(String(input)),
      method: init.method ?? 'GET',
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? init.body : undefined,
    });

    const next = queue.shift();

    if (next === undefined) throw new Error(`No reply queued for ${init.method} ${String(input)}`);
    if (next instanceof Error) throw next;

    return next;
  };

  return { fetch: fetch as typeof globalThis.fetch, requests };
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export const noSleep = async (): Promise<void> => {};

export function account(scopes: string[], overrides: Record<string, unknown> = {}) {
  return {
    data: {
      object: 'account',
      id: 'usr_1',
      type: 'user',
      name: 'Toko Uji',
      email: 'owner@example.com',
      plan: { name: 'Pro', expires_at: '2027-01-01T00:00:00+07:00' },
      credits: { sms: 10, email: 20, whatsapp: 30 },
      rate_limit: 60,
      scopes,
      ...overrides,
    },
  };
}

export function apiError(
  status: number,
  type: string,
  code: string,
  message: string,
  param: string | null = null
) {
  return {
    error: { type, code, message, param, doc_url: `https://docs.sendkuy.com/errors#${code}` },
  };
}

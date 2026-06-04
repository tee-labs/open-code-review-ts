/**
 * Custom fetch wrapper that fixes Content-Type mismatches from API proxies.
 *
 * Some proxy servers return Content-Type: text/plain even when the body
 * is valid JSON. The OpenAI SDK rejects responses without application/json
 * Content-Type, causing "Cannot read properties of undefined (reading '0')".
 *
 * This interceptor detects JSON bodies served as text/plain and corrects
 * the Content-Type header so the SDK can parse them.
 */
export function createLLMFetch(): typeof fetch {
  return async (url, init) => {
    const response = await fetch(url, init);
    const ct = response.headers.get('content-type') || '';
    if (ct.startsWith('text/plain') && response.ok) {
      const body = await response.text();
      try {
        JSON.parse(body);
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: { ...Object.fromEntries(response.headers), 'content-type': 'application/json' },
        });
      } catch {}
    }
    return response;
  };
}

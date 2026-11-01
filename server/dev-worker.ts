import { cleanup, handleRequest, type Env } from './api';

// This entry point is used only by wrangler.dev.jsonc. Deployed Pages Functions
// call api.ts directly and always keep their __Host- Secure session cookie.
const productionCookie = '__Host-learning_log_session';
const developmentCookie = 'learning_log_dev_session';
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export default {
  async fetch(request, env, ctx) {
    if (!loopback.has(new URL(request.url).hostname)) {
      return new Response('The development API only accepts loopback requests.', { status: 403 });
    }
    const headers = new Headers(request.headers);
    const cookies = headers.get('Cookie')?.split(';').map(value => value.trim())
      .filter(value => !value.startsWith(`${productionCookie}=`))
      .map(value => value.startsWith(`${developmentCookie}=`)
        ? `${productionCookie}=${value.slice(developmentCookie.length + 1)}` : value);
    if (cookies) headers.set('Cookie', cookies.join('; '));
    const response = await handleRequest(new Request(request, { headers }), env, ctx);
    const responseHeaders = new Headers(response.headers);
    const setCookie = responseHeaders.get('Set-Cookie');
    if (setCookie?.startsWith(`${productionCookie}=`)) {
      responseHeaders.set('Set-Cookie', setCookie.replace(productionCookie, developmentCookie).replace('; Secure', ''));
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  },
  async scheduled(_event, env) { await cleanup(env); },
} satisfies ExportedHandler<Env>;

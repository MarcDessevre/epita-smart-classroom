async function proxyModelRequest(request, path) {
  const upstream = await fetch(`https://huggingface.co/${path}`, {
    headers: { Accept: request.headers.get('Accept') || '*/*' }
  });
  const headers = new Headers(upstream.headers);
  headers.delete('set-cookie');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/hf/')) {
      return proxyModelRequest(request, url.pathname.slice('/hf/'.length));
    }
    return env.ASSETS.fetch(request);
  }
};

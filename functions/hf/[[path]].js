export async function onRequest({ request, params }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
  const upstreamUrl = `https://huggingface.co/${path}`;
  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: request.headers.get('Accept') || '*/*'
    }
  });

  const headers = new Headers(upstream.headers);
  headers.delete('set-cookie');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(upstream.body, { status: upstream.status, headers });
}

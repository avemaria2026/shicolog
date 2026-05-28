// 一時デバッグエンドポイント: /api/og-debug
// /api/og で何が起きてるか診断する。

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const diagnostics = {
    runtime: 'edge',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: 基本動作
  try {
    diagnostics.tests.basicResponse = 'ok';
  } catch (e) {
    diagnostics.tests.basicResponse = `error: ${e.message}`;
  }

  // Test 2: @vercel/og importできるか
  try {
    const mod = await import('@vercel/og');
    diagnostics.tests.canImportVercelOg = Object.keys(mod);
  } catch (e) {
    diagnostics.tests.canImportVercelOg = `error: ${e.message}`;
  }

  // Test 3: フォントfetchできるか
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-400-normal.woff2');
    diagnostics.tests.fontFetch = `${r.status} ${r.headers.get('content-type')}`;
    const buf = await r.arrayBuffer();
    diagnostics.tests.fontSize = buf.byteLength;
  } catch (e) {
    diagnostics.tests.fontFetch = `error: ${e.message}`;
  }

  // Test 4: ImageResponse を最小ケースで生成できるか
  try {
    const { ImageResponse } = await import('@vercel/og');
    const img = new ImageResponse(
      {
        type: 'div',
        props: {
          style: { width: '100%', height: '100%', display: 'flex', background: 'red' },
          children: 'hello',
        },
      },
      { width: 200, height: 200 }
    );
    diagnostics.tests.imageResponseCreated = `type=${img.constructor.name}`;
  } catch (e) {
    diagnostics.tests.imageResponseCreated = `error: ${e.message}`;
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
}

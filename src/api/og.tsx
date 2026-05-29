// Vercel Edge Function: /api/og?actress=...&work=...&how=...
// または月次サマリーモード: ?monthly=1&month=5&count=12&actress=...&how=...
//
// シコログの賢者報告用シェアOG画像を動的生成して 1200x630 PNGで返す。
// データはサーバーに保存しない（クエリパラメータに乗ってる分だけ使う）。
//
// 重要：satori は WOFF2 を読めないので OTF/TTF/WOFF を使うこと。
// JSX 構文は Vercel が標準でトランスパイルしないので jsx-runtime の jsx()/jsxs() を直接呼ぶ。

import { jsx, jsxs } from 'react/jsx-runtime';
import { ImageResponse } from '@vercel/og';
import type { ReactNode } from 'react';

export const config = { runtime: 'edge' };

const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf';

function truncate(s: string | null, n: number): string {
  const str = String(s || '').trim();
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

type CSS = Record<string, string | number>;

function div(style: CSS, children: ReactNode) {
  return jsx('div', { style, children });
}

function divs(style: CSS, children: ReactNode[]) {
  return jsxs('div', { style, children });
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const isMonthly = url.searchParams.get('monthly') === '1';
  const actress = truncate(url.searchParams.get('actress'), 30);
  const work = truncate(url.searchParams.get('work'), 60);
  const how = truncate(url.searchParams.get('how'), 30);
  const month = Math.max(
    1,
    Math.min(12, parseInt(url.searchParams.get('month') || '', 10) || new Date().getMonth() + 1),
  );
  const count = Math.max(0, parseInt(url.searchParams.get('count') || '', 10) || 0);

  const boldData = await fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer());

  const children: ReactNode[] = isMonthly
    ? [
        div(
          { display: 'flex', fontSize: 48, fontWeight: 700, color: '#6b4f2a', marginBottom: 30 },
          '📊 月の賢者度',
        ),
        div(
          { display: 'flex', fontSize: 36, fontWeight: 700, color: '#3a2d1a', marginBottom: 10 },
          `${month}月`,
        ),
        div(
          { display: 'flex', fontSize: 100, fontWeight: 700, color: '#3a2d1a', marginBottom: 30 },
          `${count} 回`,
        ),
        actress
          ? div(
              { display: 'flex', fontSize: 32, color: '#5a4520', fontWeight: 700, marginBottom: 10 },
              `✨ 主役：${actress}`,
            )
          : '',
        how
          ? div(
              { display: 'flex', fontSize: 26, color: '#7a5d30', marginBottom: 30 },
              `［${how}］`,
            )
          : '',
        div(
          { display: 'flex', fontSize: 24, color: '#8a6f45' },
          '📓 シコログ — shicolog.vercel.app',
        ),
      ]
    : [
        div(
          { display: 'flex', fontSize: 48, fontWeight: 700, color: '#6b4f2a', marginBottom: 40 },
          '📜 賢者報告',
        ),
        work
          ? div(
              {
                display: 'flex',
                fontSize: 36,
                fontWeight: 700,
                color: '#3a2d1a',
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 1.3,
                maxWidth: 1000,
              },
              work,
            )
          : div(
              { display: 'flex', fontSize: 36, fontWeight: 700, color: '#3a2d1a', marginBottom: 24 },
              '今日も賢者の道を歩む',
            ),
        actress
          ? div(
              { display: 'flex', fontSize: 32, color: '#5a4520', fontWeight: 700, marginBottom: 14 },
              `✨ ${actress}`,
            )
          : '',
        how ? div({ display: 'flex', fontSize: 26, color: '#7a5d30', marginBottom: 40 }, `［${how}］`) : '',
        div(
          { display: 'flex', fontSize: 24, color: '#8a6f45' },
          '📓 シコログ — shicolog.vercel.app',
        ),
      ];

  // 空文字（''）は React の有効な child だが見た目に影響しない。
  // 条件で要素を出し分けるための簡易表現として使う。

  const tree = divs(
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff8e6',
      color: '#3a2d1a',
      fontFamily: 'NotoSansJP',
      padding: '60px',
    },
    children,
  );

  // ImageResponse はデフォルトでチャンク転送（Content-Length無し）。
  // 一部のクローラ（X含む可能性）が chunked を嫌うため、一度 ArrayBuffer に
  // 溜めてから Content-Length 明示で返す。サイズが軽い（〜40KB）ので問題なし。
  const imgRes = new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'NotoSansJP', data: boldData, style: 'normal', weight: 700 }],
    emoji: 'twemoji',
  });
  const buf = await imgRes.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(buf.byteLength),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

// Vercel Edge Function: /api/og?actress=...&work=...&how=...
// または月次サマリーモード: ?monthly=1&month=5&count=12&actress=...&how=...
//
// シコログの賢者報告用シェアOG画像を 1200x630 PNG で動的生成して返す。
// データはサーバーに保存しない（クエリパラメータに乗ってる分だけ使う）。
//
// 注：Vercelの.tsxトランスパイルがJSX構文を変換しなかったため、
// react/jsx-runtime の jsx() を直接呼んで要素ツリーを組む。
// これは @vercel/og + satori が期待する $$typeof シンボル付き要素を作る。

import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-700-normal.woff2';
const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-400-normal.woff2';

function truncate(s: string | null, n: number): string {
  const str = String(s || '').trim();
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

// jsx() ラッパー。styleとchildren以外は受け取らない簡易版。
function d(style: Record<string, any>, children: any) {
  return jsx('div', { style, children });
}
function ds(style: Record<string, any>, children: any[]) {
  return jsxs('div', { style, children });
}

function renderRecord({ actress, work, how }: { actress: string; work: string; how: string }) {
  const hasAny = !!(actress || work || how);
  const middleItems: any[] = [];
  if (work) {
    middleItems.push(d(
      { display: 'flex', fontSize: 38, fontWeight: 700, color: '#3a2d1a', lineHeight: 1.3, textAlign: 'center' },
      work
    ));
  }
  if (actress) {
    middleItems.push(d(
      { display: 'flex', fontSize: 32, color: '#5a4520', fontWeight: 700 },
      `✨ ${actress}`
    ));
  }
  if (how) {
    middleItems.push(d(
      { display: 'flex', fontSize: 28, color: '#7a5d30' },
      `［${how}］`
    ));
  }
  if (!hasAny) {
    middleItems.push(d(
      { display: 'flex', fontSize: 38, fontWeight: 700, color: '#3a2d1a' },
      '賢者になりました'
    ));
  }

  return [
    d(
      { display: 'flex', fontSize: 48, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em' },
      '📜 賢者報告'
    ),
    ds(
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 1000 },
      middleItems
    ),
    ds(
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
      [
        d({ display: 'flex', fontSize: 28, color: '#6b4f2a' }, 'あなたはどこまで賢者になれるのか？'),
        d({ display: 'flex', fontSize: 22, color: '#8a6f45' }, '📓 シコログ — shicolog.vercel.app'),
      ]
    ),
  ];
}

function renderMonthly({ month, count, actress, how }: { month: number; count: number; actress: string; how: string }) {
  const summary: any[] = [];
  if (actress) summary.push(d({ display: 'flex', fontSize: 30, color: '#5a4520', fontWeight: 700 }, `✨ 主役：${actress}`));
  if (how) summary.push(d({ display: 'flex', fontSize: 26, color: '#7a5d30' }, `［${how}］`));
  if (summary.length === 0) summary.push(d({ display: 'flex', fontSize: 24, color: '#8a6f45' }, '今月も賢者の道を歩んだ'));

  return [
    d(
      { display: 'flex', fontSize: 44, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em' },
      '📊 月の賢者度'
    ),
    ds(
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
      [
        d({ display: 'flex', fontSize: 36, fontWeight: 700, color: '#3a2d1a' }, `${month}月`),
        d({ display: 'flex', fontSize: 80, fontWeight: 700, color: '#3a2d1a', lineHeight: 1 }, `${count} 回`),
      ]
    ),
    ds(
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
      summary
    ),
    ds(
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
      [
        d({ display: 'flex', fontSize: 26, color: '#6b4f2a' }, 'あなたはどこまで賢者になれるのか？'),
        d({ display: 'flex', fontSize: 22, color: '#8a6f45' }, '📓 シコログ — shicolog.vercel.app'),
      ]
    ),
  ];
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const isMonthly = url.searchParams.get('monthly') === '1';
  const actress = truncate(url.searchParams.get('actress'), 30);
  const work = truncate(url.searchParams.get('work'), 60);
  const how = truncate(url.searchParams.get('how'), 30);
  const month = parseInt(url.searchParams.get('month') || '', 10) || (new Date().getMonth() + 1);
  const count = parseInt(url.searchParams.get('count') || '', 10) || 0;

  const [boldData, regularData] = await Promise.all([
    fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer()),
    fetch(FONT_REGULAR_URL).then((r) => r.arrayBuffer()),
  ]);

  const innerChildren = isMonthly
    ? renderMonthly({ month, count, actress, how })
    : renderRecord({ actress, work, how });

  const tree = ds(
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #fff8e6 0%, #f3e3bf 100%)',
      padding: '40px',
      fontFamily: 'NotoSansJP',
    },
    [
      ds(
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          border: '4px double #b89968',
          borderRadius: 18,
          padding: '50px 60px',
          backgroundColor: 'rgba(255,255,255,0.25)',
        },
        innerChildren
      ),
    ]
  );

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'NotoSansJP', data: boldData, style: 'normal', weight: 700 },
      { name: 'NotoSansJP', data: regularData, style: 'normal', weight: 400 },
    ],
    emoji: 'twemoji',
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

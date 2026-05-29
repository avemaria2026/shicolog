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

// Noto Sans JP OTF（notofonts/noto-cjk から jsDelivr 経由で取得）
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

function renderRecord({ actress, work, how }: { actress: string; work: string; how: string }) {
  const middle: ReactNode[] = [];
  if (work) {
    middle.push(
      div({ display: 'flex', fontSize: 40, fontWeight: 700, color: '#3a2d1a', lineHeight: 1.3, textAlign: 'center' }, work)
    );
  }
  if (actress) {
    middle.push(
      div({ display: 'flex', fontSize: 34, fontWeight: 700, color: '#5a4520' }, `✨ ${actress}`)
    );
  }
  if (how) {
    middle.push(
      div({ display: 'flex', fontSize: 28, color: '#7a5d30' }, `［${how}］`)
    );
  }
  if (middle.length === 0) {
    middle.push(
      div({ display: 'flex', fontSize: 40, fontWeight: 700, color: '#3a2d1a' }, '賢者になりました')
    );
  }

  return [
    div({ display: 'flex', fontSize: 52, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em' }, '📜 賢者報告'),
    divs({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }, middle),
    divs({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }, [
      div({ display: 'flex', fontSize: 26, color: '#6b4f2a' }, 'あなたはどこまで賢者になれるのか？'),
      div({ display: 'flex', fontSize: 22, color: '#8a6f45' }, '📓 シコログ — shicolog.vercel.app'),
    ]),
  ];
}

function renderMonthly({ month, count, actress, how }: { month: number; count: number; actress: string; how: string }) {
  const summary: ReactNode[] = [];
  if (actress) summary.push(div({ display: 'flex', fontSize: 32, color: '#5a4520', fontWeight: 700 }, `✨ 主役：${actress}`));
  if (how) summary.push(div({ display: 'flex', fontSize: 26, color: '#7a5d30' }, `［${how}］`));
  if (summary.length === 0) summary.push(div({ display: 'flex', fontSize: 24, color: '#8a6f45' }, '今月も賢者の道を歩んだ'));

  return [
    div({ display: 'flex', fontSize: 46, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em' }, '📊 月の賢者度'),
    divs({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, [
      div({ display: 'flex', fontSize: 38, fontWeight: 700, color: '#3a2d1a' }, `${month}月`),
      div({ display: 'flex', fontSize: 96, fontWeight: 700, color: '#3a2d1a', lineHeight: 1 }, `${count} 回`),
    ]),
    divs({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, summary),
    divs({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }, [
      div({ display: 'flex', fontSize: 26, color: '#6b4f2a' }, 'あなたはどこまで賢者になれるのか？'),
      div({ display: 'flex', fontSize: 22, color: '#8a6f45' }, '📓 シコログ — shicolog.vercel.app'),
    ]),
  ];
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const isMonthly = url.searchParams.get('monthly') === '1';
  const actress = truncate(url.searchParams.get('actress'), 30);
  const work = truncate(url.searchParams.get('work'), 60);
  const how = truncate(url.searchParams.get('how'), 30);
  const month = Math.max(1, Math.min(12, parseInt(url.searchParams.get('month') || '', 10) || (new Date().getMonth() + 1)));
  const count = Math.max(0, parseInt(url.searchParams.get('count') || '', 10) || 0);

  const boldData = await fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer());

  const innerChildren = isMonthly ? renderMonthly({ month, count, actress, how }) : renderRecord({ actress, work, how });

  // 外枠：パピルス調グラデ + 内側に二重ボーダーの賢者カード
  const tree = divs(
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
      divs(
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
    fonts: [{ name: 'NotoSansJP', data: boldData, style: 'normal', weight: 700 }],
    emoji: 'twemoji',
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

// Vercel Edge Function: /api/og?actress=...&work=...&how=...
// または月次サマリーモード: ?monthly=1&month=5&count=12&actress=...&how=...
//
// シコログの賢者報告用シェアOG画像を動的生成して 1200x630 PNGで返す。
// X/Twitter 等のクライアントがOGPを読みに来た時にこのURLを叩く想定。
// データはサーバーに保存しない（クエリパラメータに乗ってる分だけ使う）。
//
// 注：JSXを使わず satori のJSON element形式で組み立てる。
// .mjs 拡張子なので ESM で書ける。Vercel は @vercel/og + edge runtime を
// このまま処理する。

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-700-normal.woff2';
const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-400-normal.woff2';

function truncate(s, n) {
  s = String(s || '').trim();
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// satoriが受け取るReact要素相当のJSONを組み立てるヘルパー
function el(type, style, children) {
  return { type, props: { style, children } };
}

function buildRecordTree({ actress, work, how }) {
  const hasAny = !!(actress || work || how);
  const middleChildren = [];

  if (work) {
    middleChildren.push(
      el('div', {
        display: 'flex',
        fontSize: 38,
        fontWeight: 700,
        color: '#3a2d1a',
        lineHeight: 1.3,
        textAlign: 'center',
        maxWidth: 1000,
      }, work)
    );
  }
  if (actress) {
    middleChildren.push(
      el('div', {
        display: 'flex',
        fontSize: 32,
        color: '#5a4520',
        fontWeight: 700,
      }, `✨ ${actress}`)
    );
  }
  if (how) {
    middleChildren.push(
      el('div', {
        display: 'flex',
        fontSize: 28,
        color: '#7a5d30',
      }, `［${how}］`)
    );
  }
  if (!hasAny) {
    middleChildren.push(
      el('div', {
        display: 'flex',
        fontSize: 38,
        fontWeight: 700,
        color: '#3a2d1a',
      }, '賢者になりました')
    );
  }

  return [
    el('div', {
      display: 'flex', fontSize: 48, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em',
    }, '📜 賢者報告'),
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    }, middleChildren),
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }, [
      el('div', { display: 'flex', fontSize: 28, color: '#6b4f2a' },
        'あなたはどこまで賢者になれるのか？'),
      el('div', { display: 'flex', fontSize: 22, color: '#8a6f45' },
        '📓 シコログ — shicolog.vercel.app'),
    ]),
  ];
}

function buildMonthlyTree({ month, count, actress, how }) {
  const summaryChildren = [];
  if (actress) {
    summaryChildren.push(
      el('div', { display: 'flex', fontSize: 30, color: '#5a4520', fontWeight: 700 },
        `✨ 主役：${actress}`)
    );
  }
  if (how) {
    summaryChildren.push(
      el('div', { display: 'flex', fontSize: 26, color: '#7a5d30' }, `［${how}］`)
    );
  }

  return [
    el('div', {
      display: 'flex', fontSize: 44, fontWeight: 700, color: '#6b4f2a', letterSpacing: '0.08em',
    }, '📊 月の賢者度'),
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }, [
      el('div', { display: 'flex', fontSize: 36, fontWeight: 700, color: '#3a2d1a' },
        `${month}月`),
      el('div', { display: 'flex', fontSize: 80, fontWeight: 700, color: '#3a2d1a', lineHeight: 1 },
        `${count} 回`),
    ]),
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }, summaryChildren.length > 0 ? summaryChildren : [
      el('div', { display: 'flex', fontSize: 24, color: '#8a6f45' }, '今月も賢者の道を歩んだ'),
    ]),
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }, [
      el('div', { display: 'flex', fontSize: 26, color: '#6b4f2a' },
        'あなたはどこまで賢者になれるのか？'),
      el('div', { display: 'flex', fontSize: 22, color: '#8a6f45' },
        '📓 シコログ — shicolog.vercel.app'),
    ]),
  ];
}

export default async function handler(req) {
  const url = new URL(req.url);
  const isMonthly = url.searchParams.get('monthly') === '1';
  const actress = truncate(url.searchParams.get('actress'), 30);
  const work = truncate(url.searchParams.get('work'), 60);
  const how = truncate(url.searchParams.get('how'), 30);
  const month = parseInt(url.searchParams.get('month'), 10) || (new Date().getMonth() + 1);
  const count = parseInt(url.searchParams.get('count'), 10) || 0;

  const [boldData, regularData] = await Promise.all([
    fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer()),
    fetch(FONT_REGULAR_URL).then((r) => r.arrayBuffer()),
  ]);

  const innerChildren = isMonthly
    ? buildMonthlyTree({ month, count, actress, how })
    : buildRecordTree({ actress, work, how });

  const tree = el('div', {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #fff8e6 0%, #f3e3bf 100%)',
    padding: '40px',
    fontFamily: 'NotoSansJP',
  }, [
    el('div', {
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
    }, innerChildren),
  ]);

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

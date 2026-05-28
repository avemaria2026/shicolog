// 段階構築：フォント読み込み + 単一テキストの日本語表示
import { jsx, jsxs } from 'react/jsx-runtime';
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-700-normal.woff2';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const actress = (url.searchParams.get('actress') || '').trim().slice(0, 30);
  const work = (url.searchParams.get('work') || '').trim().slice(0, 60);

  const boldData = await fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer());

  const tree = jsxs('div', {
    style: {
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
    children: [
      jsx('div', {
        style: { display: 'flex', fontSize: 48, fontWeight: 700, color: '#6b4f2a', marginBottom: 40 },
        children: '📜 賢者報告',
      }),
      jsx('div', {
        style: { display: 'flex', fontSize: 36, fontWeight: 700, color: '#3a2d1a', textAlign: 'center', marginBottom: 24 },
        children: work || '今日も賢者の道を歩む',
      }),
      jsx('div', {
        style: { display: 'flex', fontSize: 32, color: '#5a4520', fontWeight: 700, marginBottom: 40 },
        children: actress ? `✨ ${actress}` : '',
      }),
      jsx('div', {
        style: { display: 'flex', fontSize: 24, color: '#8a6f45' },
        children: '📓 シコログ — shicolog.vercel.app',
      }),
    ],
  });

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'NotoSansJP', data: boldData, style: 'normal', weight: 700 }],
    emoji: 'twemoji',
  });
}

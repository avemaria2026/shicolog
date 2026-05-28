// 動作確認用ミニマル版 — まずここから組み立て直す
import { jsx } from 'react/jsx-runtime';
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  const el = jsx('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'red',
      fontSize: 80,
      color: 'white',
    },
    children: 'OG minimal',
  });
  return new ImageResponse(el, { width: 1200, height: 630 });
}

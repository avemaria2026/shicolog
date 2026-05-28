// 別ルートテスト: react/jsx-runtime の jsx() を直接呼ぶ（JSX構文を使わない）
// もしこちらが動けば、Vercel が .tsx の JSX をトランスパイルできてないのが原因と確定する
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
    children: 'Hello no-jsx',
  });
  return new ImageResponse(el, { width: 1200, height: 630 });
}

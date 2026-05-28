// 最小JSXテスト：Vercelの.tsxトランスパイルが効いてるか確認する
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'red',
          fontSize: 80,
          color: 'white',
        }}
      >
        Hello シコログ
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

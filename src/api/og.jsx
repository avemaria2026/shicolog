// Vercel Edge Function: /api/og?actress=...&work=...&how=...
// シコログの賢者報告用シェアOG画像を動的生成して 1200x630 PNGで返す。
// X/Twitter 等のクライアントがOGPを読みに来た時にこのURLを叩く想定。
// データはサーバーに保存しない（クエリパラメータに乗ってる分だけ使う）。

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// Noto Sans JP（jsDelivr CDN経由・Google Fonts CDNは避ける）
const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-700-normal.woff2';
const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@latest/files/noto-sans-jp-japanese-400-normal.woff2';

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

export default async function handler(req) {
  const url = new URL(req.url);
  const actress = truncate((url.searchParams.get('actress') || '').trim(), 30);
  const work = truncate((url.searchParams.get('work') || '').trim(), 60);
  const how = truncate((url.searchParams.get('how') || '').trim(), 30);

  const [boldData, regularData] = await Promise.all([
    fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer()),
    fetch(FONT_REGULAR_URL).then((r) => r.arrayBuffer()),
  ]);

  const hasAny = !!(actress || work || how);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #fff8e6 0%, #f3e3bf 100%)',
          padding: '40px',
          fontFamily: 'NotoSansJP',
        }}
      >
        <div
          style={{
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
          }}
        >
          {/* 上：見出し */}
          <div
            style={{
              display: 'flex',
              fontSize: 48,
              fontWeight: 700,
              color: '#6b4f2a',
              letterSpacing: '0.08em',
            }}
          >
            📜 賢者報告
          </div>

          {/* 中：記録内容 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              maxWidth: 1000,
              textAlign: 'center',
            }}
          >
            {work && (
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: '#3a2d1a',
                  lineHeight: 1.3,
                  textAlign: 'center',
                }}
              >
                {work}
              </div>
            )}
            {actress && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 32,
                  color: '#5a4520',
                  fontWeight: 700,
                }}
              >
                ✨ {actress}
              </div>
            )}
            {how && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  color: '#7a5d30',
                }}
              >
                ［{how}］
              </div>
            )}
            {!hasAny && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 38,
                  fontWeight: 700,
                  color: '#3a2d1a',
                }}
              >
                賢者になりました
              </div>
            )}
          </div>

          {/* 下：タグライン＋フッター */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                color: '#6b4f2a',
              }}
            >
              あなたはどこまで賢者になれるのか？
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: '#8a6f45',
              }}
            >
              📓 シコログ — shicolog.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'NotoSansJP', data: boldData, style: 'normal', weight: 700 },
        { name: 'NotoSansJP', data: regularData, style: 'normal', weight: 400 },
      ],
      emoji: 'twemoji',
      headers: {
        // Xや Bot が再取得しに来た時にエッジで再生成しなくて済むよう、軽くキャッシュ
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}

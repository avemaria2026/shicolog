// Vercel Serverless Function: /api/oracle-today (rewritten from /oracle/today)
// 「今日の悟りの書」公開ページ。
// - 日付（JST）をシードにして、人気上位500件の中から1作品を日替わりで選ぶ
// - シコログ謹製のOGP画像つき → X等でシェアした時にカード化される
// - ゆめばっか垢が毎日 /oracle/today をX投稿するだけでネタが供給される想定

const ITEM_LIST_URL = 'https://api.dmm.com/affiliate/v3/ItemList';
const COMPILATION_PATTERN = /(BEST|ベスト|総集編|傑作選|コレクション|\d+時間|全\d+本|大全集)/i;

// vocchan-015 と同期している（app.jsとも一致）。link_tool/ch_id=link で計上。
const FANZA_AFFILIATE_ID = 'vocchan-015';
const FANZA_CHANNEL_ID = 'link';
const APP_ORIGIN = 'https://shicolog.vercel.app';

function isCompilation(title) {
  return COMPILATION_PATTERN.test(title || '');
}

function wrapFanzaAffiliate(url) {
  if (!url) return url;
  if (/^https?:\/\/al\.(fanza|dmm)\.co\.jp\//i.test(url)) return url;
  return `https://al.dmm.co.jp/?lurl=${encodeURIComponent(url)}&af_id=${encodeURIComponent(FANZA_AFFILIATE_ID)}&ch=link_tool&ch_id=${encodeURIComponent(FANZA_CHANNEL_ID)}`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function todayJstYmd() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function fetchPopular(apiId, affiliateId, offset, hits) {
  const params = new URLSearchParams({
    api_id: apiId, affiliate_id: affiliateId,
    site: 'FANZA', service: 'digital', floor: 'videoa',
    hits: String(hits), offset: String(offset),
    sort: 'rank', output: 'json',
  });
  const r = await fetch(`${ITEM_LIST_URL}?${params.toString()}`);
  if (!r.ok) throw new Error(`DMM API ${r.status}`);
  const d = await r.json();
  return (d && d.result && d.result.items) || [];
}

module.exports = async (req, res) => {
  const apiId = process.env.DMM_API_ID;
  const affiliateId = process.env.DMM_AFFILIATE_ID;
  if (!apiId || !affiliateId) {
    res.status(500).send('configuration error');
    return;
  }

  try {
    const ymd = todayJstYmd();
    const seed = hashStr(ymd);
    const offset = (seed % 480) + 1;

    const items = await fetchPopular(apiId, affiliateId, offset, 30);
    const singles = items.filter((it) => !isCompilation(it.title));
    const pool = singles.length > 0 ? singles : items;
    const pick = pool[seed % pool.length];

    if (!pick) {
      res.status(503).send('no pick available');
      return;
    }

    const title = pick.title || '';
    const imageUrl = (pick.imageURL && (pick.imageURL.large || pick.imageURL.list)) || '';
    const fanzaUrl = wrapFanzaAffiliate(pick.URL || '');
    const actress =
      (pick.iteminfo && pick.iteminfo.actress && pick.iteminfo.actress[0] && pick.iteminfo.actress[0].name) || '';

    // OG画像：シコログ謹製の動的画像。oracle/today では作品名と女優名を焼き込む
    const ogParams = new URLSearchParams();
    if (title) ogParams.set('work', title);
    if (actress) ogParams.set('actress', actress);
    const ogImageUrl = `${APP_ORIGIN}/api/og?${ogParams.toString()}`;

    const pageTitle = `📜 今日の悟りの書（${ymd}）`;
    const desc = `今日の啓示：『${title}』。シコログが毎日選ぶFANZA作品。あなたはどこまで賢者になれるのか？`;

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(pageTitle)} — シコログ</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="referrer" content="no-referrer">

<meta property="og:type" content="article">
<meta property="og:url" content="${APP_ORIGIN}/oracle/today">
<meta property="og:title" content="${escapeHtml(pageTitle)} — シコログ">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(ogImageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="シコログ">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(pageTitle)} — シコログ">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">

<link rel="canonical" href="${APP_ORIGIN}/oracle/today">
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Yu Gothic', sans-serif;
       max-width: 520px; margin: 0 auto; padding: 28px 20px 60px;
       background: linear-gradient(180deg, #fff8e6 0%, #f3e3bf 100%);
       color: #3a2d1a; line-height: 1.6; min-height: 100vh; }
h1 { text-align: center; font-size: 22px; margin: 0 0 4px; color: #6b4f2a; letter-spacing: 0.08em; font-weight: 700; }
.date { text-align: center; font-size: 13px; color: #8a6f45; margin: 0 0 24px; }
.card { background: rgba(255,255,255,0.5); border: 2px double #b89968; border-radius: 12px; padding: 18px; margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.thumb-wrap { background: #ece0c4; border-radius: 6px; overflow: hidden; }
.thumb { width: 100%; display: block; }
.work-title { font-size: 16px; font-weight: 700; margin: 16px 0 8px; line-height: 1.4; color: #3a2d1a; }
.actress { font-size: 14px; color: #5a4520; margin: 0 0 18px; font-weight: 600; }
.btn { display: block; width: 100%; padding: 14px; text-align: center;
       text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;
       margin-bottom: 12px; transition: transform 0.1s; }
.btn:active { transform: scale(0.98); }
.btn-fanza { background: #d44; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.btn-shicolog { background: #3b6e8f; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.btn-shicolog small { font-weight: 400; opacity: 0.85; display: block; margin-top: 4px; font-size: 12px; }
.note { text-align: center; font-size: 12px; color: #8a6f45; margin-top: 28px; }
.note a { color: #6b4f2a; }
</style>
</head>
<body>
<h1>📜 今日の悟りの書</h1>
<p class="date">${escapeHtml(ymd)}</p>

<div class="card">
  ${imageUrl ? `<div class="thumb-wrap"><img class="thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy"></div>` : ''}
  <div class="work-title">${escapeHtml(title)}</div>
  ${actress ? `<div class="actress">✨ ${escapeHtml(actress)}</div>` : ''}
  <a class="btn btn-fanza" href="${escapeHtml(fanzaUrl)}" target="_blank" rel="noopener noreferrer">🎬 FANZAで見る</a>
</div>

<a class="btn btn-shicolog" href="${APP_ORIGIN}/">
  📓 シコログを使う
  <small>あなたはどこまで賢者になれるのか？</small>
</a>

<p class="note">
  毎日違う作品が表示されます。<br>
  Powered by <a href="${APP_ORIGIN}/">シコログ</a> × FANZA
</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // 1日に何度叩かれてもエッジで使い回せるように
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('failed to load oracle');
  }
};

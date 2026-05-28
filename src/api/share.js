// Vercel Serverless Function: /api/share?actress=...&work=...&how=...&url=<fanza>
// X等のシェアで使う中継ページ。
// - X/TwitterのBotがOGPを読みに来た時は、シコログ謹製のOG画像を返す
// - 実ユーザーが踏んだ時は、FANZAのURLへリダイレクトする（meta refresh + JS）
// データはサーバーに保存しない（クエリパラメータに乗ってる分だけ使う）。

const APP_ORIGIN = 'https://shicolog.vercel.app';

// リダイレクト先として許可するドメイン（FANZA/DMM系のみ。オープンリダイレクト脆弱性対策）
const ALLOWED_HOST_PATTERN = /^(?:[\w.-]+\.)?(?:dmm|fanza)\.co\.jp$/i;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function truncate(s, max) {
  s = String(s || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function isSafeRedirect(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return ALLOWED_HOST_PATTERN.test(u.hostname);
  } catch (_) {
    return false;
  }
}

module.exports = (req, res) => {
  const q = req.query || {};
  const isMonthly = q.monthly === '1';
  const month = Math.max(1, Math.min(12, parseInt(q.month, 10) || 0));
  const count = Math.max(0, parseInt(q.count, 10) || 0);
  const actress = truncate(q.actress, 60);
  const work = truncate(q.work, 120);
  const how = truncate(q.how, 60);
  const rawUrl = (q.url || '').toString();

  const redirectUrl = isSafeRedirect(rawUrl) ? rawUrl : APP_ORIGIN + '/';

  // OG画像：当面は静的なシコログOGP画像を使う。
  // 動的生成（/api/og）はフォント読み込みの問題で詰まっているため、後日リベンジ。
  // 静的でも「シコログのブランド画像が乗ったカード」体験は確保できる。
  const ogImageUrl = `${APP_ORIGIN}/ogp.png`;

  // OGP用のタイトル・説明
  let title;
  if (isMonthly) {
    title = `📊 ${month}月の賢者度：${count}回`;
  } else if (work) {
    title = `『${work}』で賢者になりました`;
  } else if (actress) {
    title = `${actress}さんで賢者になりました`;
  } else if (how) {
    title = `${how}で賢者になりました`;
  } else {
    title = '賢者になりました';
  }
  title = title + ' — シコログ';

  let description;
  if (isMonthly) {
    const parts = [];
    if (actress) parts.push(`主役：${actress}`);
    if (how) parts.push(`ジャンル：${how}`);
    description = parts.length > 0
      ? parts.join(' / ') + ' — あなたはどこまで賢者になれるのか？'
      : 'シコログで今月の賢者度を集計しました。あなたはどこまで賢者になれるのか？';
  } else {
    const parts = [];
    if (actress) parts.push(`女優：${actress}`);
    if (how) parts.push(`ジャンル：${how}`);
    description = parts.length > 0
      ? parts.join(' / ') + ' — あなたはどこまで賢者になれるのか？'
      : 'シコログで賢者報告。あなたはどこまで賢者になれるのか？';
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex,follow">

<meta property="og:type" content="article">
<meta property="og:url" content="${APP_ORIGIN}/share">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ogImageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="シコログ">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">

<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
<link rel="canonical" href="${APP_ORIGIN}/">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
       max-width: 520px; margin: 60px auto; padding: 0 24px; color: #333; text-align: center; line-height: 1.6; }
a { color: #3b6e8f; word-break: break-all; }
.loader { font-size: 32px; }
</style>
</head>
<body>
<div class="loader">📓 → 🎬</div>
<p>FANZAに移動しています…</p>
<p>自動で移動しない場合は <a href="${escapeHtml(redirectUrl)}">こちら</a> をタップ</p>
<script>
// Bot対策で meta refresh は残しつつ、実ユーザーには即時遷移させる
location.replace(${JSON.stringify(redirectUrl)});
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(html);
};

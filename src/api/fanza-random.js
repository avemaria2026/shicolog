// Vercel Serverless Function: /api/fanza-random
// FANZAから「今日の悟りの書」用にランダムで1作品を返す。
// 人気上位帯（sort=rank）の中からランダムオフセットを取って、
// BEST編/総集編っぽいタイトルを弾いた残りから1件選ぶ。

const ITEM_LIST_URL = 'https://api.dmm.com/affiliate/v3/ItemList';

// BEST編・総集編・コンプリート系を弾くためのタイトルパターン
const COMPILATION_PATTERN = /(BEST|ベスト|総集編|傑作選|コレクション|\d+時間|全\d+本|大全集)/i;

function isCompilation(title) {
  return COMPILATION_PATTERN.test(title || '');
}

async function fetchItems(apiId, affiliateId, offset) {
  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits: '20',
    offset: String(offset),
    sort: 'rank',
    output: 'json',
  });
  const res = await fetch(`${ITEM_LIST_URL}?${params.toString()}`);
  if (!res.ok) {
    const err = new Error(`DMM API returned ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data && data.result && data.result.items) || [];
}

module.exports = async (req, res) => {
  const apiId = process.env.DMM_API_ID;
  const affiliateId = process.env.DMM_AFFILIATE_ID;
  if (!apiId || !affiliateId) {
    return res.status(500).json({ error: 'server is not configured (missing DMM credentials)' });
  }

  try {
    // 人気上位の中からランダムなオフセット位置を取る（毎リロード違う作品が出るように）
    const offset = Math.floor(Math.random() * 480) + 1; // 1..480
    const items = await fetchItems(apiId, affiliateId, offset);
    const filtered = items.filter((it) => !isCompilation(it.title));
    const pool = filtered.length > 0 ? filtered : items;
    if (pool.length === 0) {
      return res.status(204).end();
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    res.status(200).json({
      source: 'dmm',
      product: {
        cid: pick.content_id,
        title: pick.title,
        imageUrl:
          (pick.imageURL && (pick.imageURL.large || pick.imageURL.list || pick.imageURL.small)) || '',
        url: pick.URL || '',
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'random pick failed', detail: e.message });
  }
};

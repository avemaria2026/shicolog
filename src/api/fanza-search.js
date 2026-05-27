// Vercel Serverless Function: /api/fanza-search?actress=<name>
// DMM Web Service API v3 を叩いて FANZA の作品一覧を返す。
// 環境変数 DMM_API_ID / DMM_AFFILIATE_ID（末尾990〜999のID）が必須。
//
// 流れ：
//   1) 女優検索API で女優名 → actress_id を引く
//   2) 商品検索API に article=actress&article_id=<id>&sort=date を渡し、
//      その女優の作品だけを発売日順で取得
//   3) 女優が見つからない場合はキーワード検索にフォールバック

const ACTRESS_SEARCH_URL = 'https://api.dmm.com/affiliate/v3/ActressSearch';
const ITEM_LIST_URL = 'https://api.dmm.com/affiliate/v3/ItemList';

async function findActressId(apiId, affiliateId, name) {
  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    keyword: name,
    hits: '5',
    output: 'json',
  });
  const res = await fetch(`${ACTRESS_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const list = (data && data.result && data.result.actress) || [];
  if (list.length === 0) return null;
  // 完全一致を優先、なければ先頭（スコア最上位）
  const exact = list.find((a) => a.name === name);
  return (exact || list[0]).id || null;
}

async function fetchItems(apiId, affiliateId, extraParams) {
  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits: '10',
    sort: 'date',
    output: 'json',
    ...extraParams,
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

function mapItems(items) {
  // url は「生の商品ページURL」を返す。クライアント側で wrapFanzaAffiliate() が一回だけラップする。
  return items.map((it) => ({
    cid: it.content_id,
    title: it.title,
    imageUrl:
      (it.imageURL && (it.imageURL.list || it.imageURL.small || it.imageURL.large)) || '',
    url: it.URL || '',
  }));
}

module.exports = async (req, res) => {
  const { actress } = req.query;

  if (!actress || typeof actress !== 'string' || !actress.trim()) {
    return res.status(400).json({ error: 'actress query parameter is required' });
  }

  const apiId = process.env.DMM_API_ID;
  const affiliateId = process.env.DMM_AFFILIATE_ID;

  if (!apiId || !affiliateId) {
    return res.status(500).json({ error: 'server is not configured (missing DMM credentials)' });
  }

  const name = actress.trim();

  try {
    // 1) 女優ID を引いてみる
    let actressId = null;
    try {
      actressId = await findActressId(apiId, affiliateId, name);
    } catch (_) {
      // 女優検索失敗は致命傷ではない。下のキーワード検索にフォールバック。
    }

    // 2) 女優IDが取れたら厳密に絞り込み、ダメならキーワード検索
    let items;
    let mode;
    if (actressId) {
      items = await fetchItems(apiId, affiliateId, {
        article: 'actress',
        article_id: String(actressId),
      });
      mode = 'actress';
    } else {
      items = await fetchItems(apiId, affiliateId, { keyword: name });
      mode = 'keyword';
    }

    const products = mapItems(items);

    res.status(200).json({
      source: 'dmm',
      mode,
      query: name,
      products,
      count: products.length,
    });
  } catch (e) {
    res.status(500).json({ error: 'search failed', detail: e.message });
  }
};

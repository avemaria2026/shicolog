// Vercel Serverless Function: /api/fanza-search?actress=<name>
// DMM Web Service API v3 を叩いて FANZA の作品一覧を返す。
// 環境変数 DMM_API_ID / DMM_AFFILIATE_ID（末尾990〜999のID）が必須。
//
// 流れ：
//   1) 女優検索API で女優名 → actress_id を引く
//   2) 商品検索API に article=actress&article_id=<id>&sort=date を渡し、
//      その女優の作品だけを発売日順で取得（多めに30件）
//   3) 取得結果からBEST編/総集編をフィルタ、最大10件まで返す
//   4) フィルタで全部弾かれた場合は元の結果をそのまま返す（無音回避）
//   5) 女優が見つからない場合はキーワード検索にフォールバック

const ACTRESS_SEARCH_URL = 'https://api.dmm.com/affiliate/v3/ActressSearch';
const ITEM_LIST_URL = 'https://api.dmm.com/affiliate/v3/ItemList';

// 単発作品を優先するため、明らかなBEST編/総集編タイトルを弾くパターン
const COMPILATION_PATTERN = /(BEST|ベスト|総集編|傑作選|コレクション|\d+時間|全\d+本|大全集)/i;

function isCompilation(title) {
  return COMPILATION_PATTERN.test(title || '');
}

// 未発売（予約商品）を弾く。FANZA APIの date は "YYYY-MM-DD HH:MM:SS" JST。
// 日付パース失敗時は除外しない（安全側）。
function isReleased(item) {
  const d = item && item.date;
  if (!d) return true;
  const ts = Date.parse(String(d).replace(' ', 'T') + '+09:00');
  if (Number.isNaN(ts)) return true;
  return ts <= Date.now();
}

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
    hits: '30',
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
    // 1) 女優ID を引いてみる（失敗してもキーワード検索にフォールバックするので致命傷ではない）
    let actressId = null;
    try {
      actressId = await findActressId(apiId, affiliateId, name);
    } catch (_) {}

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

    // 3) 未発売（予約商品）を先に弾き、その後 BEST編/総集編を弾く。
    //    フォールバック：単発フィルタ→発売済フィルタ→元リスト の順で空回避。
    const released = items.filter((it) => isReleased(it));
    const filtered = released.filter((it) => !isCompilation(it.title));
    const pool = filtered.length > 0 ? filtered : (released.length > 0 ? released : items);
    const products = mapItems(pool.slice(0, 10));

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

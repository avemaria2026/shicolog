// Vercel Serverless Function: /api/fanza-search?actress=<name>
// DMM Web Service API v3（商品検索API）を叩いて FANZA の作品一覧を返す。
// 環境変数 DMM_API_ID / DMM_AFFILIATE_ID（末尾990〜999のID）が必須。

const DMM_API_URL = 'https://api.dmm.com/affiliate/v3/ItemList';

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

  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits: '10',
    sort: 'date',
    keyword: actress.trim(),
    output: 'json',
  });

  const apiUrl = `${DMM_API_URL}?${params.toString()}`;

  try {
    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      return res.status(502).json({ error: 'DMM API returned non-OK status', status: apiRes.status });
    }
    const data = await apiRes.json();
    const items = (data && data.result && data.result.items) || [];

    const products = items.map((it) => ({
      cid: it.content_id,
      title: it.title,
      imageUrl:
        (it.imageURL && (it.imageURL.list || it.imageURL.small || it.imageURL.large)) || '',
      url: it.affiliateURL || it.URL || '',
    }));

    res.status(200).json({
      source: 'dmm',
      query: actress,
      products,
      count: products.length,
    });
  } catch (e) {
    res.status(500).json({ error: 'search failed', detail: e.message });
  }
};

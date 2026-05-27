// Vercel Serverless Function: /api/fanza-search?actress=<name>
// フェーズA：モックデータ返却。
// フェーズB（DMM API ID承認後）：実際の DMM Web Service API 呼び出しに差し替える。

const { searchMockProducts } = require('./_mockProducts');

module.exports = async (req, res) => {
  const { actress } = req.query;

  if (!actress || typeof actress !== 'string' || !actress.trim()) {
    return res.status(400).json({ error: 'actress query parameter is required' });
  }

  try {
    const products = await searchMockProducts(actress);
    res.status(200).json({
      source: 'mock',
      query: actress,
      products,
      count: products.length,
    });
  } catch (e) {
    res.status(500).json({ error: 'search failed', detail: e.message });
  }
};

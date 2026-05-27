// 開発用モックデータ。フェーズB（DMM API承認後）に削除する。
// 主要女優について作品サンプルを5件ずつ手書き。
// 画像URLは FANZA の典型的なパッケージ画像URL形式に従っているが、
// 実在しないCIDの場合は表示時にonerrorで代替アイコンを使う想定。

const MOCK_DATA = {
  '松本いちか': [
    { cid: 'ssis-101', title: '【モック】「即イキ即イラマ」松本いちか', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00101/ssis00101pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-101/' },
    { cid: 'ssis-102', title: '【モック】「完全主観密着」松本いちか', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00102/ssis00102pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-102/' },
    { cid: 'ssis-103', title: '【モック】「絶頂50回」松本いちか', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00103/ssis00103pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-103/' },
    { cid: 'ssis-104', title: '【モック】「ハメ撮り温泉旅行」松本いちか', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00104/ssis00104pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-104/' },
    { cid: 'ssis-105', title: '【モック】「ベスト10時間」松本いちか', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00105/ssis00105pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-105/' },
  ],
  '美谷朱里': [
    { cid: 'ssis-201', title: '【モック】「淫語誘惑」美谷朱里', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00201/ssis00201pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-201/' },
    { cid: 'ssis-202', title: '【モック】「妖艶痴女」美谷朱里', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00202/ssis00202pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-202/' },
    { cid: 'ssis-203', title: '【モック】「主観責め」美谷朱里', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00203/ssis00203pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-203/' },
    { cid: 'ssis-204', title: '【モック】「絶頂中出し」美谷朱里', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00204/ssis00204pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-204/' },
    { cid: 'ssis-205', title: '【モック】「ベスト8時間」美谷朱里', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssis00205/ssis00205pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis-205/' },
  ],
  '石川澪': [
    { cid: 'mide-101', title: '【モック】「初体験」石川澪', imageUrl: 'https://pics.dmm.co.jp/digital/video/mide00101/mide00101pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=mide-101/' },
    { cid: 'mide-102', title: '【モック】「制服プレイ」石川澪', imageUrl: 'https://pics.dmm.co.jp/digital/video/mide00102/mide00102pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=mide-102/' },
    { cid: 'mide-103', title: '【モック】「お風呂で」石川澪', imageUrl: 'https://pics.dmm.co.jp/digital/video/mide00103/mide00103pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=mide-103/' },
    { cid: 'mide-104', title: '【モック】「先輩との関係」石川澪', imageUrl: 'https://pics.dmm.co.jp/digital/video/mide00104/mide00104pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=mide-104/' },
    { cid: 'mide-105', title: '【モック】「ベスト6時間」石川澪', imageUrl: 'https://pics.dmm.co.jp/digital/video/mide00105/mide00105pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=mide-105/' },
  ],
  '三上悠亜': [
    { cid: 'ssni-101', title: '【モック】「美女との一夜」三上悠亜', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssni00101/ssni00101pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssni-101/' },
    { cid: 'ssni-102', title: '【モック】「主観イチャラブ」三上悠亜', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssni00102/ssni00102pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssni-102/' },
    { cid: 'ssni-103', title: '【モック】「ハメ撮り旅行」三上悠亜', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssni00103/ssni00103pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssni-103/' },
    { cid: 'ssni-104', title: '【モック】「絶頂中出し」三上悠亜', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssni00104/ssni00104pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssni-104/' },
    { cid: 'ssni-105', title: '【モック】「ベスト12時間」三上悠亜', imageUrl: 'https://pics.dmm.co.jp/digital/video/ssni00105/ssni00105pl.jpg', url: 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssni-105/' },
  ],
};

/**
 * モックデータから女優名で作品を検索する。
 * 完全一致 → 部分一致（名字のみ等）の順でフォールバック。
 * 一致無しの場合は空配列を返す。
 */
function searchMockProducts(actressName) {
  const key = (actressName || '').trim();
  if (!key) return [];

  // 完全一致
  if (MOCK_DATA[key]) return MOCK_DATA[key];

  // 部分一致（フリガナ・名字だけのケース等に対応）
  for (const [name, products] of Object.entries(MOCK_DATA)) {
    if (name.includes(key) || key.includes(name)) {
      return products;
    }
  }
  return [];
}

module.exports = { searchMockProducts, MOCK_DATA };

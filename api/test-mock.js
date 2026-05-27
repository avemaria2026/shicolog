const assert = require('assert');
const { searchMockProducts, MOCK_DATA } = require('./_mockProducts');

// 完全一致
const matsumoto = searchMockProducts('松本いちか');
assert.strictEqual(matsumoto.length, 5, '松本いちか should have 5 products');
assert.ok(matsumoto[0].cid, 'product should have cid');
assert.ok(matsumoto[0].title, 'product should have title');
assert.ok(matsumoto[0].imageUrl.startsWith('https://'), 'imageUrl should be absolute https URL');
assert.ok(matsumoto[0].url.startsWith('https://'), 'url should be absolute https URL');

// 部分一致（名字のみ）
const matsu = searchMockProducts('松本');
assert.strictEqual(matsu.length, 5, '"松本" should partial-match 松本いちか');

// 部分一致（フルネーム → 別女優）
const mitani = searchMockProducts('美谷');
assert.strictEqual(mitani.length, 5, '"美谷" should partial-match 美谷朱里');

// 該当なし
const unknown = searchMockProducts('存在しない女優');
assert.deepStrictEqual(unknown, [], 'unknown actress should return empty array');

// 空文字
const empty = searchMockProducts('');
assert.deepStrictEqual(empty, [], 'empty string should return empty array');

// 全体構造
for (const [name, products] of Object.entries(MOCK_DATA)) {
  assert.strictEqual(products.length, 5, `${name} should have 5 products`);
  products.forEach((p, i) => {
    assert.ok(p.cid && p.title && p.imageUrl && p.url,
      `${name}[${i}] missing required field`);
  });
}

console.log('PASS: all mock product assertions');

# 作品取り込み機能 フェーズA 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** シコログのレコードに `work`（FANZA作品）フィールドを追加。Vercel Serverless Function（モックデータ返却）経由で女優の作品一覧をモーダル内に表示し、タップで選択。履歴・統計・Xシェアまでフル対応する。DMM API ID 承認後（フェーズB）はモックを実APIに差し替えるだけで本番稼働できる状態を作る。

**Architecture:** 静的PWA + Vercel Serverless Function 1個（`/api/fanza-search`）のハイブリッド構成。フロントエンドは `?actress=<name>` でGET → JSON 配列を受け取り → モーダル内インラインカードで表示。選択された作品は `record.work`（オプショナル）に永続化され、履歴表示・統計集計・Xシェア・エクスポートに反映される。

**Tech Stack:** Vanilla JS（ビルドなし）、Vercel Serverless Functions（Node.js 標準）、Vercel-hosted 静的サイト、テストフレームワーク無し（純粋ロジックは node スクリプトで、UI は本番デプロイ後の手動スモークテストで検証）。

**Spec:** [`docs/superpowers/specs/2026-05-27-work-integration-design.md`](../specs/2026-05-27-work-integration-design.md)

---

## File Structure

### 新規作成

| ファイル | 責務 |
|---|---|
| `api/fanza-search.js` | Vercel Serverless Function。`?actress=<name>` を受け取り、モックデータから当該女優の作品を返す |
| `api/_mockProducts.js` | 主要女優の作品サンプルデータ（フェーズBで削除） |
| `api/test-mock.js` | モックデータの検索ロジック検証用 node スクリプト |

### 修正

| ファイル | 修正内容 |
|---|---|
| `src/index.html` | 記録モーダルに「作品を探す」ボタン＋作品リスト用 div を追加。OGP・SW precache 更新 |
| `src/app.js` | `record.work` データ層対応、モーダル UI ロジック、履歴描画拡張、統計ランキング追加、Xシェアの作品URL利用、CSV/JSONエクスポート拡張 |
| `src/styles.css` | 作品カード（モーダル内・履歴・統計）スタイル |
| `src/sw.js` | キャッシュバージョン bump |
| `src/help.html` | 作品取り込み機能の使い方追記 |

---

## Tasks

### Task 1: モック作品データ作成 + ロジック検証

**Files:**
- Create: `api/_mockProducts.js`
- Create: `api/test-mock.js`

- [ ] **Step 1: モックデータファイル作成**

`api/_mockProducts.js`:
```js
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
```

- [ ] **Step 2: 検証スクリプト作成**

`api/test-mock.js`:
```js
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
```

- [ ] **Step 3: 検証スクリプト実行**

Run: `node api/test-mock.js`
Expected output: `PASS: all mock product assertions`

- [ ] **Step 4: コミット**

```bash
git add api/_mockProducts.js api/test-mock.js
git commit -m "feat: add mock FANZA product data with search logic"
```

---

### Task 2: Vercel Serverless Function 作成

**Files:**
- Create: `api/fanza-search.js`

- [ ] **Step 1: API関数作成**

`api/fanza-search.js`:
```js
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
```

- [ ] **Step 2: ローカルでロジック確認**

検証用ワンライナー：
```bash
node -e "const h=require('./api/fanza-search'); const req={query:{actress:'松本いちか'}}; const res={status:(c)=>({json:(o)=>{console.log('STATUS',c);console.log(JSON.stringify(o,null,2));return res}})}; h(req,res);"
```

Expected: `STATUS 200` + JSON with `products` array of 5 items.

エラーケース：
```bash
node -e "const h=require('./api/fanza-search'); const req={query:{}}; const res={status:(c)=>({json:(o)=>{console.log('STATUS',c,JSON.stringify(o));return res}})}; h(req,res);"
```

Expected: `STATUS 400 {"error":"actress query parameter is required"}`

- [ ] **Step 3: コミット**

```bash
git add api/fanza-search.js
git commit -m "feat: add Vercel serverless function for FANZA product search (mock)"
```

- [ ] **Step 4: Vercelデプロイ確認**

```bash
git push
```

push後2〜3分でVercelが自動デプロイ。完了したら：

```bash
curl -s "https://shicolog.vercel.app/api/fanza-search?actress=松本いちか" | head -c 500
```

Expected: JSON response with `"source":"mock"` and `products` array.

エラーケース：
```bash
curl -s "https://shicolog.vercel.app/api/fanza-search" -w "\nHTTP %{http_code}\n"
```

Expected: `HTTP 400` with error JSON.

---

### Task 3: フロントエンド データ層 - work フィールド対応

**Files:**
- Modify: `src/app.js` (addRecord / updateRecord)

- [ ] **Step 1: addRecord 関数に work 引数追加**

[src/app.js](src/app.js) の `addRecord` を修正。Find this code:

```js
function addRecord({ who, how }) {
    const records = loadRecords();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      datetime: new Date().toISOString(),
      who: (who || '').trim(),
      how: (how || '').trim(),
    };
    records.push(record);
    saveRecords(records);
```

Replace with:

```js
function addRecord({ who, how, work }) {
    const records = loadRecords();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      datetime: new Date().toISOString(),
      who: (who || '').trim(),
      how: (how || '').trim(),
    };
    // work はオプショナル。指定があれば cid/title/imageUrl/url を保存
    if (work && work.cid && work.title) {
      record.work = {
        cid: work.cid,
        title: work.title,
        imageUrl: work.imageUrl || '',
        url: work.url || '',
      };
    }
    records.push(record);
    saveRecords(records);
```

- [ ] **Step 2: updateRecord 関数に work 引数追加**

[src/app.js](src/app.js) の `updateRecord` を探す。Find this code:

```js
function updateRecord(id, { who, how }) {
    const records = loadRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return;
    records[idx] = {
      ...records[idx],
      who: (who || '').trim(),
      how: (how || '').trim(),
    };
    saveRecords(records);
}
```

Replace with:

```js
function updateRecord(id, { who, how, work }) {
    const records = loadRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const updated = {
      ...records[idx],
      who: (who || '').trim(),
      how: (how || '').trim(),
    };
    if (work && work.cid && work.title) {
      updated.work = {
        cid: work.cid,
        title: work.title,
        imageUrl: work.imageUrl || '',
        url: work.url || '',
      };
    } else {
      // 編集で work を解除した場合はフィールド削除
      delete updated.work;
    }
    records[idx] = updated;
    saveRecords(records);
}
```

- [ ] **Step 3: 構文チェック**

```bash
node --check d:/OneDrive/Claudecode/shicolog/src/app.js
```

Expected: no output (clean).

- [ ] **Step 4: コミット**

```bash
git add src/app.js
git commit -m "feat: support optional work field in record schema"
```

---

### Task 4: モーダルHTML - 「作品を探す」セクション追加

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: モーダルに作品セクションを追加**

[src/index.html](src/index.html) でモーダルの「誰で？」と「ジャンルは？」の間に挿入する。

Find this code:

```html
        <div class="field">
          <label class="field__label" for="input-who">誰で？</label>
          <div class="field__row">
            <input id="input-who" class="field__input" type="text" autocomplete="off" placeholder="（🎲でランダム表示）">
            <button id="btn-random-who" class="btn-random" type="button" aria-label="ランダムで女優名を入れる">
              <span aria-hidden="true">🎲</span>
            </button>
            <button id="btn-search-who-fanza" class="btn-fanza-search" type="button" aria-label="この名前でFANZA検索">
              <span class="btn-fanza-search__icon" aria-hidden="true">🔎</span>
              <span class="btn-fanza-search__label">FANZA</span>
            </button>
          </div>
          <div id="who-suggestions" class="chips chips--small"></div>
        </div>

        <div class="field">
          <span class="field__label">ジャンルは？</span>
```

Insert between `</div>` (close of 誰で field) and `<div class="field">` (open of ジャンル field):

```html
        <div class="field">
          <span class="field__label">作品は？</span>
          <div id="work-section" class="work-section">
            <button id="btn-search-works" class="btn-work-search" type="button">
              📥 この女優の作品を探す
            </button>
            <p id="work-status" class="work-status" hidden></p>
            <ul id="work-list" class="work-list" hidden></ul>
            <div id="work-selected" class="work-selected" hidden>
              <img id="work-selected-image" class="work-selected__image" alt="">
              <div class="work-selected__body">
                <div id="work-selected-title" class="work-selected__title"></div>
                <div id="work-selected-cid" class="work-selected__cid"></div>
                <button id="btn-work-clear" class="work-selected__clear" type="button">解除</button>
              </div>
            </div>
          </div>
        </div>

```

- [ ] **Step 2: 構文確認（HTMLは目視＋ローカルで開く）**

```bash
cd d:/OneDrive/Claudecode/shicolog/src && python -m http.server 8765
```

ブラウザで http://localhost:8765 を開いて「+1」タップ → モーダルに「作品は？」セクションと「📥 この女優の作品を探す」ボタンが表示されることを確認。ボタン押しても何も起きないが、エラーは出ないこと。

サーバ停止：Ctrl+C

- [ ] **Step 3: コミット**

```bash
git add src/index.html
git commit -m "feat: add work picker section to record modal"
```

---

### Task 5: 作品セクション CSS

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: 作品セクション用スタイル追加**

[src/styles.css](src/styles.css) の末尾、または `.chip-with-star` の付近に追加：

```css
/* ===== モーダル：作品取り込みセクション ===== */
.work-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-work-search {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--surface-alt, #f0f3f5);
  border: 1px dashed var(--accent);
  border-radius: 8px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.btn-work-search:active {
  background: rgba(59, 110, 143, 0.1);
}
.btn-work-search:disabled {
  opacity: 0.6;
  cursor: default;
}

.work-status {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  color: var(--text-sub);
  text-align: center;
}
.work-status--error {
  color: var(--danger, #c34a4a);
}

.work-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px;
}

.work-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.work-card:active {
  background: var(--surface-alt, rgba(0,0,0,0.04));
  border-color: var(--accent);
}
.work-card__image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: #ddd;
}
.work-card__body {
  flex: 1;
  min-width: 0;
}
.work-card__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.work-card__cid {
  font-size: 11px;
  color: var(--text-sub);
}

.work-selected {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--surface);
  border: 2px solid var(--accent);
  border-radius: 8px;
}
.work-selected__image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: #ddd;
}
.work-selected__body {
  flex: 1;
  min-width: 0;
}
.work-selected__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}
.work-selected__cid {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 6px;
}
.work-selected__clear {
  font-size: 12px;
  color: var(--accent);
  background: transparent;
  border: none;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 2: 目視確認**

ローカルサーバ起動 → モーダル開く → 「作品は？」セクションの「📥 この女優の作品を探す」ボタンが破線枠でレンダリングされてることを目視確認（中身は空）。

```bash
cd d:/OneDrive/Claudecode/shicolog/src && python -m http.server 8765
# ブラウザで http://localhost:8765 開いてモーダル確認
# Ctrl+C
```

- [ ] **Step 3: コミット**

```bash
git add src/styles.css
git commit -m "feat: style work picker section (button/list/selected)"
```

---

### Task 6: モーダル JS - 作品検索＆カード描画

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Modal オブジェクトにフィールド参照と状態追加**

[src/app.js](src/app.js) の `Modal` オブジェクトの `init()` を修正：

Find:
```js
    init() {
      this.el = document.getElementById('modal');
      this.inputWho = document.getElementById('input-who');
      this.inputHow = document.getElementById('input-how');
      this.titleEl = document.getElementById('modal-title');
      this.datetimeEl = document.getElementById('modal-datetime');
      this.btnSkip = document.getElementById('btn-skip');
      this.btnDelete = document.getElementById('btn-delete');
      this.btnSave = document.getElementById('btn-save');
      this.whoSuggestionsEl = document.getElementById('who-suggestions');

      // 「誰で？」入力欄にタイプしたらサジェストを部分一致で絞り込む
      this.inputWho.addEventListener('input', () => {
        this.renderWhoSuggestions(this.inputWho.value);
      });
    },
```

Replace with:
```js
    init() {
      this.el = document.getElementById('modal');
      this.inputWho = document.getElementById('input-who');
      this.inputHow = document.getElementById('input-how');
      this.titleEl = document.getElementById('modal-title');
      this.datetimeEl = document.getElementById('modal-datetime');
      this.btnSkip = document.getElementById('btn-skip');
      this.btnDelete = document.getElementById('btn-delete');
      this.btnSave = document.getElementById('btn-save');
      this.whoSuggestionsEl = document.getElementById('who-suggestions');

      // 作品セクション要素
      this.btnSearchWorks = document.getElementById('btn-search-works');
      this.workStatusEl = document.getElementById('work-status');
      this.workListEl = document.getElementById('work-list');
      this.workSelectedEl = document.getElementById('work-selected');
      this.workSelectedImage = document.getElementById('work-selected-image');
      this.workSelectedTitle = document.getElementById('work-selected-title');
      this.workSelectedCid = document.getElementById('work-selected-cid');
      this.btnWorkClear = document.getElementById('btn-work-clear');

      // 選択中の作品（保存時に使う）
      this.selectedWork = null;

      // 「誰で？」入力欄にタイプしたらサジェストを部分一致で絞り込む
      this.inputWho.addEventListener('input', () => {
        this.renderWhoSuggestions(this.inputWho.value);
      });

      // 「📥 この女優の作品を探す」クリック
      this.btnSearchWorks.addEventListener('click', () => this.searchWorks());

      // 「解除」クリック
      this.btnWorkClear.addEventListener('click', () => this.clearWork());
    },
```

- [ ] **Step 2: searchWorks / renderWorks / selectWork / clearWork メソッド追加**

`renderWhoSuggestions` メソッドの**直後**に追加：

```js
    async searchWorks() {
      const actress = (this.inputWho.value || '').trim();
      if (!actress) {
        this.workStatusEl.textContent = '先に女優名を入力してください';
        this.workStatusEl.className = 'work-status work-status--error';
        this.workStatusEl.hidden = false;
        this.workListEl.hidden = true;
        return;
      }

      // ローディング表示
      this.workStatusEl.textContent = `「${actress}」の作品を検索中…`;
      this.workStatusEl.className = 'work-status';
      this.workStatusEl.hidden = false;
      this.workListEl.hidden = true;
      this.btnSearchWorks.disabled = true;

      try {
        const url = `/api/fanza-search?actress=${encodeURIComponent(actress)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const products = Array.isArray(data.products) ? data.products : [];
        this.renderWorks(products);
      } catch (e) {
        this.workStatusEl.textContent = `通信エラー：${e.message}`;
        this.workStatusEl.className = 'work-status work-status--error';
        this.workListEl.hidden = true;
      } finally {
        this.btnSearchWorks.disabled = false;
      }
    },

    renderWorks(products) {
      this.workListEl.innerHTML = '';
      if (products.length === 0) {
        this.workStatusEl.textContent = '作品が見つかりませんでした';
        this.workStatusEl.className = 'work-status';
        this.workStatusEl.hidden = false;
        this.workListEl.hidden = true;
        return;
      }
      this.workStatusEl.hidden = true;
      this.workListEl.hidden = false;

      const frag = document.createDocumentFragment();
      products.forEach((p) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'work-card';

        const img = document.createElement('img');
        img.className = 'work-card__image';
        img.src = p.imageUrl || '';
        img.alt = '';
        // 画像読み込み失敗時のフォールバック
        img.onerror = () => {
          img.style.background = 'linear-gradient(135deg, #ccc, #999)';
          img.removeAttribute('src');
        };
        btn.appendChild(img);

        const body = document.createElement('div');
        body.className = 'work-card__body';
        const title = document.createElement('div');
        title.className = 'work-card__title';
        title.textContent = p.title;
        body.appendChild(title);
        const cid = document.createElement('div');
        cid.className = 'work-card__cid';
        cid.textContent = p.cid;
        body.appendChild(cid);
        btn.appendChild(body);

        btn.addEventListener('click', () => this.selectWork(p));
        li.appendChild(btn);
        frag.appendChild(li);
      });
      this.workListEl.appendChild(frag);
    },

    selectWork(work) {
      this.selectedWork = {
        cid: work.cid,
        title: work.title,
        imageUrl: work.imageUrl || '',
        url: work.url || '',
      };
      // リストを隠して選択カードを表示
      this.workListEl.hidden = true;
      this.workStatusEl.hidden = true;
      this.btnSearchWorks.hidden = true;
      this.workSelectedImage.src = work.imageUrl || '';
      this.workSelectedImage.onerror = () => {
        this.workSelectedImage.style.background = 'linear-gradient(135deg, #ccc, #999)';
        this.workSelectedImage.removeAttribute('src');
      };
      this.workSelectedTitle.textContent = work.title;
      this.workSelectedCid.textContent = work.cid;
      this.workSelectedEl.hidden = false;
    },

    clearWork() {
      this.selectedWork = null;
      this.workSelectedEl.hidden = true;
      this.btnSearchWorks.hidden = false;
      this.workListEl.innerHTML = '';
      this.workListEl.hidden = true;
      this.workStatusEl.hidden = true;
    },
```

- [ ] **Step 3: Modal.open / Modal.close で作品状態を初期化**

`Modal.open` を修正。

Find:
```js
    open(mode, record = null) {
      this.mode = mode;
      this.editingId = record ? record.id : null;

      if (mode === 'create') {
        this.titleEl.textContent = '記録する';
        this.datetimeEl.textContent = '';
        this.datetimeEl.hidden = true;
        this.btnSkip.hidden = false;
        this.btnDelete.hidden = true;
        // FANZAから戻ってきた直後なら「誰で」に予約された名前を自動入力
        this.inputWho.value = getPendingWho();
        this.inputHow.value = '';
      } else {
        this.titleEl.textContent = '記録を編集';
        this.datetimeEl.textContent = formatDateTime(record.datetime);
        this.datetimeEl.hidden = false;
        this.btnSkip.hidden = true;
        this.btnDelete.hidden = false;
        this.inputWho.value = record.who || '';
        this.inputHow.value = record.how || '';
      }
      this.syncChipSelection();
      this.renderWhoSuggestions();

      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
    },
```

Replace with:
```js
    open(mode, record = null) {
      this.mode = mode;
      this.editingId = record ? record.id : null;

      // 作品セクション初期化
      this.clearWork();

      if (mode === 'create') {
        this.titleEl.textContent = '記録する';
        this.datetimeEl.textContent = '';
        this.datetimeEl.hidden = true;
        this.btnSkip.hidden = false;
        this.btnDelete.hidden = true;
        // FANZAから戻ってきた直後なら「誰で」に予約された名前を自動入力
        this.inputWho.value = getPendingWho();
        this.inputHow.value = '';
      } else {
        this.titleEl.textContent = '記録を編集';
        this.datetimeEl.textContent = formatDateTime(record.datetime);
        this.datetimeEl.hidden = false;
        this.btnSkip.hidden = true;
        this.btnDelete.hidden = false;
        this.inputWho.value = record.who || '';
        this.inputHow.value = record.how || '';
        // 既存記録に作品があれば選択状態で復元
        if (record.work) {
          this.selectWork(record.work);
        }
      }
      this.syncChipSelection();
      this.renderWhoSuggestions();

      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
    },
```

- [ ] **Step 4: 保存処理で selectedWork を addRecord/updateRecord に渡す**

`commitFromModal` を探す。

Find:
```js
  function commitFromModal({ skipMemo }) {
    if (Modal.mode === 'create') {
      const who = skipMemo ? '' : Modal.inputWho.value;
      const how = skipMemo ? '' : Modal.inputHow.value;
      addRecord({ who, how });
      clearPendingWho();
      Modal.close();
      renderHome();
      // 履歴画面表示中なら同時に更新
      if (document.getElementById('screen-history').classList.contains('screen--active')) {
        renderHistory();
      }
    } else if (Modal.mode === 'edit') {
      updateRecord(Modal.editingId, {
        who: Modal.inputWho.value,
        how: Modal.inputHow.value,
      });
      Modal.close();
      renderHistory();
      renderHome();
    }
  }
```

Replace with:
```js
  function commitFromModal({ skipMemo }) {
    if (Modal.mode === 'create') {
      const who = skipMemo ? '' : Modal.inputWho.value;
      const how = skipMemo ? '' : Modal.inputHow.value;
      const work = skipMemo ? null : Modal.selectedWork;
      addRecord({ who, how, work });
      clearPendingWho();
      Modal.close();
      renderHome();
      // 履歴画面表示中なら同時に更新
      if (document.getElementById('screen-history').classList.contains('screen--active')) {
        renderHistory();
      }
    } else if (Modal.mode === 'edit') {
      updateRecord(Modal.editingId, {
        who: Modal.inputWho.value,
        how: Modal.inputHow.value,
        work: Modal.selectedWork,
      });
      Modal.close();
      renderHistory();
      renderHome();
    }
  }
```

- [ ] **Step 5: 構文確認**

```bash
node --check d:/OneDrive/Claudecode/shicolog/src/app.js
```

Expected: clean.

- [ ] **Step 6: コミット & デプロイ動作確認**

```bash
git add src/app.js
git commit -m "feat: wire up work picker - search, render, select, persist"
git push
```

Vercel デプロイ完了後、シークレットウィンドウで `https://shicolog.vercel.app/` を開く：
1. +1ボタンタップ → モーダル
2. 「誰？」に「松本いちか」と入力
3. 「📥 この女優の作品を探す」タップ
4. 「松本いちかの作品を検索中…」表示 → 5件のカードが出る
5. 1件タップ → 選択カードが大きく表示・「解除」リンク見える
6. 「保存」 → 履歴に記録される（履歴側はまだ作品表示してないので、レコードに work が入ってる確認はDevToolsで `localStorage.getItem('shicolog:records:v1')` を見る）

期待：レコード中に `"work":{"cid":"ssis-101",...}` が入っている。

---

### Task 7: 履歴アイテムに作品サムネ・タイトル表示

**Files:**
- Modify: `src/app.js` (renderHistory)
- Modify: `src/styles.css`

- [ ] **Step 1: renderHistory 内のレコード描画ループを更新**

[src/app.js](src/app.js) で `renderHistory` 関数の `records.forEach` ブロックを修正。

Find:
```js
    records.forEach((r) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.dataset.id = r.id;
      li.tabIndex = 0;

      const dt = document.createElement('div');
      dt.className = 'history-item__datetime';
      dt.textContent = formatDateTime(r.datetime);
      li.appendChild(dt);

      const meta = document.createElement('div');
      meta.className = 'history-item__meta';
      meta.appendChild(makeMetaField('誰で', r.who));
      meta.appendChild(makeMetaField('ジャンル', r.how));
      li.appendChild(meta);
```

Replace with:
```js
    records.forEach((r) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.dataset.id = r.id;
      li.tabIndex = 0;

      const dt = document.createElement('div');
      dt.className = 'history-item__datetime';
      dt.textContent = formatDateTime(r.datetime);
      li.appendChild(dt);

      // 作品情報があれば最上段にサムネ＋タイトル表示
      if (r.work && r.work.title) {
        const workRow = document.createElement('div');
        workRow.className = 'history-item__work';

        const img = document.createElement('img');
        img.className = 'history-item__work-image';
        img.src = r.work.imageUrl || '';
        img.alt = '';
        img.onerror = () => {
          img.style.background = 'linear-gradient(135deg, #ccc, #999)';
          img.removeAttribute('src');
        };
        // 画像タップで FANZA 作品ページへ（イベント伝播止めて編集モーダル開かない）
        img.style.cursor = 'pointer';
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          if (r.work.url) {
            const wrapped = wrapFanzaAffiliate(r.work.url);
            window.open(wrapped, '_blank', 'noopener,noreferrer');
          }
        });
        workRow.appendChild(img);

        const workBody = document.createElement('div');
        workBody.className = 'history-item__work-body';
        const workTitle = document.createElement('div');
        workTitle.className = 'history-item__work-title';
        workTitle.textContent = r.work.title;
        workBody.appendChild(workTitle);
        const workCid = document.createElement('div');
        workCid.className = 'history-item__work-cid';
        workCid.textContent = r.work.cid;
        workBody.appendChild(workCid);
        workRow.appendChild(workBody);

        li.appendChild(workRow);
      }

      const meta = document.createElement('div');
      meta.className = 'history-item__meta';
      meta.appendChild(makeMetaField('誰で', r.who));
      meta.appendChild(makeMetaField('ジャンル', r.how));
      li.appendChild(meta);
```

- [ ] **Step 2: CSS追加**

[src/styles.css](src/styles.css) に追加：

```css
/* 履歴アイテム内の作品表示 */
.history-item__work {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border);
}
.history-item__work-image {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: #ddd;
}
.history-item__work-image:active {
  opacity: 0.7;
}
.history-item__work-body {
  flex: 1;
  min-width: 0;
}
.history-item__work-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-item__work-cid {
  font-size: 11px;
  color: var(--text-sub);
}
```

- [ ] **Step 3: コミット&デプロイ**

```bash
git add src/app.js src/styles.css
git commit -m "feat: show work thumbnail and title in history items"
git push
```

デプロイ完了後、シークレットウィンドウで動作確認：
1. 既存の作品付きレコード（Task 6で作ったやつ）が履歴画面に出る
2. サムネ画像 + タイトル + CID が最上段に表示される
3. サムネタップで FANZA作品ページが新タブで開く
4. レコード本体タップで編集モーダル → 作品が選択状態で復元される

---

### Task 8: 統計画面に「作品ランキング」追加

**Files:**
- Modify: `src/app.js` (集計関数 + renderStats)
- Modify: `src/index.html` (統計画面のセクション)
- Modify: `src/styles.css`

- [ ] **Step 1: 作品ランキング集計関数追加**

[src/app.js](src/app.js) で `aggregateRanking` 関数の直後に追加：

```js
  // 作品（work）の通算ランキング集計
  function aggregateWorkRanking(records, limit = 5) {
    const map = new Map();
    records.forEach((r) => {
      if (!r.work || !r.work.cid) return;
      const cid = r.work.cid;
      const entry = map.get(cid) || {
        cid,
        title: r.work.title || '',
        imageUrl: r.work.imageUrl || '',
        url: r.work.url || '',
        count: 0,
      };
      entry.count += 1;
      // 最新の title / imageUrl で更新（同じcidで微妙にズレた場合の保険）
      entry.title = r.work.title || entry.title;
      entry.imageUrl = r.work.imageUrl || entry.imageUrl;
      entry.url = r.work.url || entry.url;
      map.set(cid, entry);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
```

- [ ] **Step 2: HTML に統計セクション追加**

[src/index.html](src/index.html) の `screen-stats` 内、`「ジャンル」ランキング` セクションの**直後**に追加：

Find:
```html
      <div class="stats-section">
        <h2 class="stats-section__title">「ジャンル」ランキング</h2>
        <ol id="stats-how-ranking" class="ranking"></ol>
      </div>
    </section>
```

Replace with:
```html
      <div class="stats-section">
        <h2 class="stats-section__title">「ジャンル」ランキング</h2>
        <ol id="stats-how-ranking" class="ranking"></ol>
      </div>

      <div class="stats-section">
        <h2 class="stats-section__title">「作品」ランキング</h2>
        <ol id="stats-work-ranking" class="work-ranking"></ol>
        <p id="stats-work-empty" class="work-ranking__empty" hidden>まだ作品付きの記録がありません。</p>
      </div>
    </section>
```

- [ ] **Step 3: renderStats 関数に作品ランキング描画追加**

[src/app.js](src/app.js) の `renderStats` 関数に追加。

Find:
```js
    renderRanking('stats-who-ranking', aggregateRanking(records, 'who', 5));
    renderRanking('stats-how-ranking', aggregateRanking(records, 'how', 5));
  }
```

Replace with:
```js
    renderRanking('stats-who-ranking', aggregateRanking(records, 'who', 5));
    renderRanking('stats-how-ranking', aggregateRanking(records, 'how', 5));
    renderWorkRanking('stats-work-ranking', aggregateWorkRanking(records, 5));
  }

  function renderWorkRanking(elId, items) {
    const el = document.getElementById(elId);
    const emptyEl = document.getElementById('stats-work-empty');
    if (!el) return;
    el.innerHTML = '';
    if (items.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    const frag = document.createDocumentFragment();
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'work-ranking__item';

      const rank = document.createElement('div');
      rank.className = 'work-ranking__rank';
      rank.textContent = `${i + 1}位`;
      li.appendChild(rank);

      const img = document.createElement('img');
      img.className = 'work-ranking__image';
      img.src = item.imageUrl || '';
      img.alt = '';
      img.onerror = () => {
        img.style.background = 'linear-gradient(135deg, #ccc, #999)';
        img.removeAttribute('src');
      };
      if (item.url) {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          window.open(wrapFanzaAffiliate(item.url), '_blank', 'noopener,noreferrer');
        });
      }
      li.appendChild(img);

      const body = document.createElement('div');
      body.className = 'work-ranking__body';
      const title = document.createElement('div');
      title.className = 'work-ranking__title';
      title.textContent = item.title;
      body.appendChild(title);
      const cid = document.createElement('div');
      cid.className = 'work-ranking__cid';
      cid.textContent = item.cid;
      body.appendChild(cid);
      li.appendChild(body);

      const count = document.createElement('div');
      count.className = 'work-ranking__count';
      count.textContent = `${item.count}回`;
      li.appendChild(count);

      frag.appendChild(li);
    });
    el.appendChild(frag);
  }
```

- [ ] **Step 4: CSS追加**

[src/styles.css](src/styles.css) に追加：

```css
/* 統計画面：作品ランキング */
.work-ranking {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.work-ranking__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.work-ranking__rank {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  width: 36px;
  flex-shrink: 0;
}
.work-ranking__image {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: #ddd;
}
.work-ranking__body {
  flex: 1;
  min-width: 0;
}
.work-ranking__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.work-ranking__cid {
  font-size: 11px;
  color: var(--text-sub);
}
.work-ranking__count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}
.work-ranking__empty {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  color: var(--text-sub);
  text-align: center;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 8px;
}
```

- [ ] **Step 5: コミット&デプロイ&確認**

```bash
git add src/app.js src/index.html src/styles.css
git commit -m "feat: add 'work' ranking section to stats screen"
git push
```

デプロイ後、確認：
1. 統計タブを開く
2. 「ジャンル」ランキングの下に「作品」ランキングが表示
3. work付きレコードが無いとき：「まだ作品付きの記録がありません」
4. work付きレコードが2件以上あるとき：ランキング表示

---

### Task 9: X シェアで作品URLを使う

**Files:**
- Modify: `src/app.js` (shareRecord)

- [ ] **Step 1: shareRecord 関数を更新**

[src/app.js](src/app.js) の `shareRecord` を修正。

Find:
```js
  function shareRecord(record) {
    const who = (record.who || '').trim();
    const how = (record.how || '').trim();

    // 文面の組み立て（女優名には敬意を込めて「さん」付け）
    let actionText;
    if (who && how) {
      actionText = `${who}さんの${how}で賢者になりました`;
    } else if (who) {
      actionText = `${who}さんで賢者になりました`;
    } else if (how) {
      actionText = `${how}で賢者になりました`;
    } else {
      actionText = '今日も賢者になりました';
    }

    // FANZA URL：女優名があれば女優検索、なければジャンル検索、それも無ければシコログ自身
    let fanzaUrl;
    if (who) {
      fanzaUrl = makeFanzaSearchUrl(who);
    } else if (how) {
      fanzaUrl = makeFanzaSearchUrl(how);
    } else {
      fanzaUrl = APP_URL;
    }

    // 本文：シコログURL を先頭側に置いて Twitterカード をシコログ側で表示させる。
    // 実測でFANZA検索URLには og:image / twitter:image メタが無くカードが出ないため、
    // シコログのカード（OGP画像付き）を出した方が視覚的に拡散しやすい。
    const text = `${actionText}\n— シコログ📓 ${APP_URL}`;

    // ハッシュタグ：シコログ + 女優名（あれば）
    const tags = ['シコログ'];
    if (who) {
      const safe = sanitizeHashtag(who);
      if (safe) tags.push(safe);
    }

    // FANZA URL は url 引数として末尾に。シコログが本文先頭で「最初のURL」になるためカード優先。
    shareToX({ text, url: fanzaUrl, hashtags: tags });
  }
```

Replace with:
```js
  function shareRecord(record) {
    const who = (record.who || '').trim();
    const how = (record.how || '').trim();
    const work = record.work || null;

    // 文面の組み立て（女優名には「さん」付け、作品名は『 』で囲む）
    let actionText;
    if (who && work && work.title) {
      actionText = `${who}さんの『${work.title}』で賢者になりました`;
    } else if (who && how) {
      actionText = `${who}さんの${how}で賢者になりました`;
    } else if (who) {
      actionText = `${who}さんで賢者になりました`;
    } else if (work && work.title) {
      actionText = `『${work.title}』で賢者になりました`;
    } else if (how) {
      actionText = `${how}で賢者になりました`;
    } else {
      actionText = '今日も賢者になりました';
    }

    // 末尾URL選択優先度：work.url > 女優FANZA検索 > ジャンルFANZA検索 > シコログ
    // 個別作品URLは og:image があるため Twitter カードに作品サムネが出る期待値が高い。
    let endUrl;
    if (work && work.url) {
      endUrl = wrapFanzaAffiliate(work.url);
    } else if (who) {
      endUrl = makeFanzaSearchUrl(who);
    } else if (how) {
      endUrl = makeFanzaSearchUrl(how);
    } else {
      endUrl = APP_URL;
    }

    // 本文：シコログ URL を本文末尾、FANZA URL は url 引数で末尾に付与。
    // 作品URLがある場合は Twitter カードに作品サムネが出る期待値が高い（仕様書 §9参照）。
    const text = `${actionText}\n— シコログ📓 ${APP_URL}`;

    // ハッシュタグ：シコログ + 女優名（あれば）
    const tags = ['シコログ'];
    if (who) {
      const safe = sanitizeHashtag(who);
      if (safe) tags.push(safe);
    }

    shareToX({ text, url: endUrl, hashtags: tags });
  }
```

- [ ] **Step 2: 構文確認**

```bash
node --check d:/OneDrive/Claudecode/shicolog/src/app.js
```

Expected: clean.

- [ ] **Step 3: コミット&デプロイ&確認**

```bash
git add src/app.js
git commit -m "feat: use work URL in X share for richer Twitter card"
git push
```

デプロイ後、確認：
1. 作品付きレコードの📤シェアボタン
2. PCなら新タブで X 投稿画面、モバイルなら X アプリが開く
3. 本文に `『作品タイトル』で賢者になりました` が入っている
4. URLが作品個別ページ（`...detail/=/cid=ssis-101/`）になっている

---

### Task 10: CSV エクスポート対応

**Files:**
- Modify: `src/app.js` (exportCSV)

- [ ] **Step 1: CSV ヘッダーとデータ行に work_cid / work_title 追加**

[src/app.js](src/app.js) の `exportCSV` 関数を探す。

Find:
```js
  function exportCSV() {
    const records = loadRecords().slice().sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
    const header = 'datetime,who,how\n';
    const rows = records.map((r) =>
      [r.datetime, csvEscape(r.who), csvEscape(r.how)].join(',')
    ).join('\n');
    const csv = '﻿' + header + rows;  // BOM付きでExcel開きやすく
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `counter-${formatStamp(new Date())}.csv`);
  }
```

(注：実際のコードと多少違う可能性あり。`exportCSV` 関数を見つけて、CSV組み立て部分を更新する)

Replace with:
```js
  function exportCSV() {
    const records = loadRecords().slice().sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
    const header = 'datetime,who,how,work_cid,work_title\n';
    const rows = records.map((r) => [
      r.datetime,
      csvEscape(r.who),
      csvEscape(r.how),
      csvEscape((r.work && r.work.cid) || ''),
      csvEscape((r.work && r.work.title) || ''),
    ].join(',')).join('\n');
    const csv = '﻿' + header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `counter-${formatStamp(new Date())}.csv`);
  }
```

- [ ] **Step 2: 手動確認**

ローカルで開いて：
```bash
cd d:/OneDrive/Claudecode/shicolog/src && python -m http.server 8765
```
ブラウザで http://localhost:8765 を開く → 設定 → CSVで書き出し → ダウンロードしたCSVをExcel等で開く → `work_cid`, `work_title` 列が増えていて、作品付きレコードのみ値が入っていることを確認。

- [ ] **Step 3: コミット&push**

```bash
git add src/app.js
git commit -m "feat: include work_cid and work_title columns in CSV export"
git push
```

---

### Task 11: JSON / 引き継ぎコード対応確認

**Files:**
- Modify: `src/app.js` (`mergeIncomingRecords`)

注：JSON export/import は `record` オブジェクトをそのまま JSON 化しているので、`work` プロパティは自動でラウンドトリップする。`mergeIncomingRecords` だけ work を保持するよう明示する。

- [ ] **Step 1: mergeIncomingRecords を更新**

[src/app.js](src/app.js) の `mergeIncomingRecords` を探す。

Find:
```js
  function mergeIncomingRecords(incoming) {
    const valid = incoming.filter(
      (r) => r && typeof r.id === 'string' && typeof r.datetime === 'string'
    );
    if (valid.length === 0) {
      throw new Error('取り込めるレコードがありませんでした');
    }
    const existing = loadRecords();
    const map = new Map();
    existing.forEach((r) => map.set(r.id, r));
    let added = 0;
    let updated = 0;
    valid.forEach((r) => {
      if (map.has(r.id)) updated++; else added++;
      map.set(r.id, {
        id: r.id,
        datetime: r.datetime,
        who: typeof r.who === 'string' ? r.who : '',
        how: typeof r.how === 'string' ? r.how : '',
      });
    });
    const merged = Array.from(map.values());
    saveRecords(merged);
    return { added, updated, total: merged.length };
  }
```

Replace with:
```js
  function mergeIncomingRecords(incoming) {
    const valid = incoming.filter(
      (r) => r && typeof r.id === 'string' && typeof r.datetime === 'string'
    );
    if (valid.length === 0) {
      throw new Error('取り込めるレコードがありませんでした');
    }
    const existing = loadRecords();
    const map = new Map();
    existing.forEach((r) => map.set(r.id, r));
    let added = 0;
    let updated = 0;
    valid.forEach((r) => {
      if (map.has(r.id)) updated++; else added++;
      const next = {
        id: r.id,
        datetime: r.datetime,
        who: typeof r.who === 'string' ? r.who : '',
        how: typeof r.how === 'string' ? r.how : '',
      };
      // work フィールドは構造を検証してから保存
      if (r.work && typeof r.work === 'object' && r.work.cid && r.work.title) {
        next.work = {
          cid: String(r.work.cid),
          title: String(r.work.title),
          imageUrl: typeof r.work.imageUrl === 'string' ? r.work.imageUrl : '',
          url: typeof r.work.url === 'string' ? r.work.url : '',
        };
      }
      map.set(r.id, next);
    });
    const merged = Array.from(map.values());
    saveRecords(merged);
    return { added, updated, total: merged.length };
  }
```

- [ ] **Step 2: 構文確認**

```bash
node --check d:/OneDrive/Claudecode/shicolog/src/app.js
```

- [ ] **Step 3: 手動確認**

ローカルで作品付きレコードを2件作って：
1. 設定 → JSON書き出し → ダウンロードしたファイルを開く → `work` フィールドが入ってる
2. 全データ削除 → JSON取り込み → 同じファイル → 取り込み後、履歴に作品サムネが復元される
3. 引き継ぎコード書き出し → コピー → 全データ削除 → 引き継ぎコード取り込み → 同じ復元

- [ ] **Step 4: コミット&push**

```bash
git add src/app.js
git commit -m "feat: preserve work field through JSON/spell import"
git push
```

---

### Task 12: help.html に作品取り込みの使い方を追記

**Files:**
- Modify: `src/help.html`

- [ ] **Step 1: 「お気に入り女優を登録する」セクションの直前に新セクション追加**

[src/help.html](src/help.html) で「お気に入り女優を登録する」 `<h2>` を探して、その**直前**に挿入：

```html
    <section class="page__section">
      <h2>記録に作品を取り込む（FANZA連動）</h2>
      <ol>
        <li>＋1ボタンをタップして記録モーダルを開く</li>
        <li>「誰？」に女優名を入力（候補チップから選んでもOK）</li>
        <li>「<strong>📥 この女優の作品を探す</strong>」をタップ</li>
        <li>FANZAから女優の作品が一覧表示される（サムネ付き）</li>
        <li>気になる作品をタップ → 選択状態（大きめサムネ）に切り替わる</li>
        <li>ジャンルも選んで「保存」</li>
      </ol>
      <p>履歴で作品のサムネ＋タイトルが表示され、サムネをタップするとFANZAの作品ページに飛びます。Xシェア時もその作品ページのリンクが付き、サムネ付きツイートになります。</p>
      <p>※ 現在モックデータ運用中（フェーズA）。DMM API承認後（フェーズB）に実際のFANZA作品データへ切り替わります。</p>
    </section>

```

- [ ] **Step 2: コミット**

```bash
git add src/help.html
git commit -m "docs: explain work-import feature in help page"
```

---

### Task 13: SW バージョン bump & 最終スモークテスト & push

**Files:**
- Modify: `src/sw.js`

- [ ] **Step 1: SW キャッシュバージョン更新**

[src/sw.js](src/sw.js) を編集。

Find:
```js
const CACHE_VERSION = 'shicolog-v18-ogp-card';
```

Replace with:
```js
const CACHE_VERSION = 'shicolog-v19-work-integration';
```

- [ ] **Step 2: 最終スモークテスト（本番URL）**

シークレットウィンドウで `https://shicolog.vercel.app/` を開いて以下フローを実施：

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | アプリ初期表示 | ロック画面無くホーム表示 |
| 2 | +1 → モーダル | 「作品は？」セクションが「ジャンルは？」の上に出る |
| 3 | 「誰？」に「松本いちか」入力 | サジェスト候補に出てくる |
| 4 | 「📥 この女優の作品を探す」タップ | 「松本いちかの作品を検索中…」→ 5件カード表示 |
| 5 | 1件タップ | 選択カード（大きめサムネ）+「解除」リンク表示 |
| 6 | ジャンル「潮吹き」入力 → 保存 | モーダル閉じる、ホームへ |
| 7 | 履歴タブ | サムネ + 作品タイトル + 「誰で:松本いちか / ジャンル:潮吹き」表示 |
| 8 | サムネタップ | 新タブで FANZA 作品ページ（モックcidなので404になる可能性あり、URL構造だけ確認） |
| 9 | レコードタップ | 編集モーダル開く、作品が選択状態で復元 |
| 10 | 「解除」リンクタップ → 保存 | 履歴から作品表示が消える |
| 11 | 統計タブ | 作品ランキングセクション表示。レコード作ってあれば集計される |
| 12 | 履歴で🎬付き記録の📤ポストボタン | 本文に「『...』で賢者になりました」、URLは作品ページURL |
| 13 | 設定→CSVで書き出し | work_cid, work_title 列ある |
| 14 | 設定→JSONで書き出し→全削除→JSON取り込み | 作品付きレコードが復元される |

- [ ] **Step 3: 全コミット&push**

```bash
git add src/sw.js
git commit -m "chore: bump SW cache to v19-work-integration (Phase A complete)"
git push
```

- [ ] **Step 4: 完了確認**

`https://shicolog.vercel.app/` で SW が新バージョン取得していること（DevTools → Application → Service Workers でバージョン確認）。

Phase A 完了！フェーズB（API ID 承認後）への引き継ぎ事項：

- `api/_mockProducts.js` 削除
- `api/fanza-search.js` の `searchMockProducts` 呼び出しを DMM Web Service API 呼び出しに差し替え
  - 環境変数：`DMM_API_ID`, `DMM_AFFILIATE_ID=vocchan-015`
  - エンドポイント：`https://api.dmm.com/affiliate/v3/ItemList`
  - パラメータ：`api_id, affiliate_id, site=FANZA, service=digital, floor=videoa, keyword=<actress>, hits=8, sort=date, output=json`
  - 戻り値整形：`result.items[].content_id → cid`, `result.items[].title → title`, `result.items[].imageURL.large → imageUrl`, `result.items[].URL → url`（または `affiliateURL`）

---

## Self-Review

**スペックカバレッジ:** 仕様書の各セクションを Task でマップ：
- §4 アーキテクチャ: Task 2
- §5 データ構造: Task 3
- §6 UX フロー: Task 4, 5, 6
- §7 履歴画面: Task 7
- §8 統計画面: Task 8
- §9 X シェア: Task 9
- §10 DMM API 仕様: Task 2 (モック実装 + Phase B 引き継ぎ事項に記載)
- §11 実装フェーズ: 本プラン全体
- §12 テスト方針: 各 Task の確認ステップ + Task 13 の包括スモークテスト

**プレースホルダー無し** — 全 Task に具体的コード。

**型整合性:** `work` オブジェクト構造 `{cid, title, imageUrl, url}` が全 Task で一致。

**シグネチャ整合性:**
- `addRecord({who, how, work})` — Task 3 で定義、Task 6 で使用 ✓
- `updateRecord(id, {who, how, work})` — Task 3 で定義、Task 6 で使用 ✓
- `searchMockProducts(actressName)` — Task 1 で定義、Task 2 で使用 ✓
- `wrapFanzaAffiliate(url)` — 既存関数、Task 7, 8 で再利用 ✓
- `aggregateWorkRanking(records, limit)` — Task 8 で定義&使用 ✓
- `Modal.selectedWork` / `Modal.searchWorks()` / `Modal.selectWork(work)` / `Modal.clearWork()` — Task 6 で定義、内部で相互参照 ✓

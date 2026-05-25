/*
 * count-app
 * 自分用カウンターアプリ
 * - 3画面＋設定タブ／LocalStorage保存／PINロック／PWA
 * - 外部通信ゼロ。データはこの端末のブラウザのみに保持。
 */

(() => {
  'use strict';

  // ===== 定数 =====
  const STORAGE_KEY = 'shicolog:records:v1';
  const PIN_KEY = 'shicolog:pin:v1';
  const BIOMETRIC_KEY = 'shicolog:biometric:v1';
  const LOCK_DISABLED_KEY = 'shicolog:lock-disabled:v1';
  const THEME_KEY = 'shicolog:theme:v1';
  const FAVORITES_KEY = 'shicolog:favorites:v1';

  // FANZA（DMMアフィリエイト）連携設定
  // アフィリエイトID承認後、ここを書き換えると全リンクが自動でアフィリエイトリンクに切り替わる
  const FANZA_AFFILIATE_ID = ''; // 例: 'shicolog-001'
  const FANZA_CHANNEL_ID = 'link';
  const RELOCK_AFTER_MS = 30 * 1000; // バックグラウンド30秒以上で再ロック
  const PIN_LENGTH = 4;

  // ===== ストレージ：記録 =====
  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

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
    return record;
  }

  function updateRecord(id, { who, how }) {
    const records = loadRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    records[idx] = {
      ...records[idx],
      who: (who || '').trim(),
      how: (how || '').trim(),
    };
    saveRecords(records);
    return true;
  }

  function deleteRecord(id) {
    const records = loadRecords().filter((r) => r.id !== id);
    saveRecords(records);
  }

  function findRecord(id) {
    return loadRecords().find((r) => r.id === id) || null;
  }

  function clearAllRecords() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FAVORITES_KEY);
  }

  // ===== ストレージ：PIN =====
  function loadPin() {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function savePin(salt, hash) {
    localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash }));
  }

  // ===== 生体認証（WebAuthn） =====
  function loadBiometric() {
    try {
      const raw = localStorage.getItem(BIOMETRIC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveBiometric(credentialId) {
    localStorage.setItem(BIOMETRIC_KEY, JSON.stringify({ credentialId }));
  }

  function clearBiometric() {
    localStorage.removeItem(BIOMETRIC_KEY);
  }

  // ===== ストレージ：お気に入り女優 =====
  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data.filter((v) => typeof v === 'string' && v.trim()) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(list) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  }

  function isFavorite(name) {
    const n = (name || '').trim();
    if (!n) return false;
    return loadFavorites().includes(n);
  }

  function addFavorite(name) {
    const n = (name || '').trim();
    if (!n) return;
    const list = loadFavorites();
    if (!list.includes(n)) {
      list.push(n);
      saveFavorites(list);
    }
  }

  function removeFavorite(name) {
    const n = (name || '').trim();
    if (!n) return;
    const list = loadFavorites().filter((v) => v !== n);
    saveFavorites(list);
  }

  function toggleFavorite(name) {
    if (isFavorite(name)) removeFavorite(name);
    else addFavorite(name);
  }

  // ===== 次の記録の「誰で」予約 =====
  // お気に入りからFANZAに飛んだ女優名を一時保存しておき、戻ってきて＋1すると
  // モーダルの「誰で」に自動入力される。sessionStorageでタブを閉じるとリセット。
  // タイムアウト（既定3時間）も持たせて長時間放置を防ぐ。
  const PENDING_WHO_KEY = 'shicolog:pending-who:v1';
  const PENDING_WHO_TTL_MS = 3 * 60 * 60 * 1000;

  // 🎲 ランダム候補用：内蔵の人気女優リスト
  // ※ FANZAのactressesページからCORS制約で動的取得できないため、定期的に手動で更新する想定
  // ※ 新人が出てきたらここに追記すればOK（順不同）
  const BUNDLED_ACTRESSES = [
    // FANZA月間ランキング上位常連
    '松本いちか', '石川澪', '逢沢みゆ', '瀬戸環奈', '三上悠亜',
    '河北彩花', '神宮寺ナオ', '桃乃木かな', '深田えいみ', '高橋しょう子',
    '桜空もも', '架乃ゆら', '天使もえ', '由愛可奈', '涼森れむ',
    // 中堅〜人気
    '楓カレン', '二宮ひかり', '通野未帆', '八掛うみ', 'JULIA',
    '美谷朱里', '麻里梨夏', '北野のぞみ', '河南実里', '戸田真琴',
    '川北メイサ', '葵', '明里つむぎ', '七沢みあ', '弥生みづき',
    'かなで自由', '楪カレン', '河合あすな', '篠田ゆう', '月乃ルナ',
    '神木麗', '佐倉ねね', '緒方咲', '美波もも', '吉高寧々',
    '阿部乃みく', '古川いおり', '橋本ありな', '久留木玲', '二葉エマ',
  ];

  function getRandomActress(excludeName = '') {
    const pool = BUNDLED_ACTRESSES.filter((n) => n !== excludeName);
    if (pool.length === 0) return BUNDLED_ACTRESSES[0] || '';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 🎲 ランダム候補用：内蔵のFANZA人気ジャンルリスト
  // ※ FANZAページからCORS制約で動的取得できないため、定期的に手動で更新する想定
  const BUNDLED_GENRES = [
    // 体型・部位
    '巨乳', '爆乳', '美乳', '貧乳', '美脚',
    '美尻', 'パイパン', 'スレンダー', 'ぽっちゃり',
    // 属性・職業
    '人妻', '熟女', '若妻', '美熟女', '美魔女',
    'JK', '女子大生', 'OL', 'ナース', '教師',
    'メイド', '秘書', 'グラビア', 'グラビアアイドル', 'アイドル',
    'モデル', 'ギャル', '黒ギャル', '美少女', '清楚', 'ロリ系',
    '知り合い',
    // シチュエーション
    '素人', 'ハメ撮り', '主観', 'ナンパ', '即ハメ',
    'NTR', '寝取られ', '不倫', '浮気', 'ハーレム',
    '3P・4P', '乱交', '痴漢', '凌辱', '輪姦',
    'デリヘル', 'ソープ', '風俗', '温泉', '野外',
    '露出', '電車', 'オフィス', '学校', '旅館',
    // 行為・属性
    '中出し', '大量中出し', '顔射', 'ぶっかけ', '潮吹き',
    'フェラ', 'パイズリ', '騎乗位', 'イラマチオ', 'アクメ',
    // コスチューム
    '制服', '水着', 'スク水', 'チャイナドレス', 'バニーガール',
    'レオタード', '体操着',
    // その他
    '痴女', 'M男', '逆レイプ', 'レズ', 'アナル', '足フェチ',
  ];

  function getRandomGenre(excludeName = '') {
    const pool = BUNDLED_GENRES.filter((n) => n !== excludeName);
    if (pool.length === 0) return BUNDLED_GENRES[0] || '';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function setPendingWho(name) {
    const n = (name || '').trim();
    if (!n) return;
    const payload = { name: n, ts: Date.now() };
    try {
      sessionStorage.setItem(PENDING_WHO_KEY, JSON.stringify(payload));
    } catch (e) {
      // sessionStorage 使えない環境では予約なしで継続
    }
  }

  function getPendingWho() {
    try {
      const raw = sessionStorage.getItem(PENDING_WHO_KEY);
      if (!raw) return '';
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.name !== 'string') return '';
      if (Date.now() - (obj.ts || 0) > PENDING_WHO_TTL_MS) {
        sessionStorage.removeItem(PENDING_WHO_KEY);
        return '';
      }
      return obj.name;
    } catch (e) {
      return '';
    }
  }

  function clearPendingWho() {
    try {
      sessionStorage.removeItem(PENDING_WHO_KEY);
    } catch (e) {}
  }

  // ===== FANZA連携 =====
  // 検索URL生成。アフィリエイトID未設定なら素のFANZA URLを返す。
  function makeFanzaSearchUrl(query) {
    const q = encodeURIComponent((query || '').trim());
    if (!q) {
      // クエリ空ならFANZA動画トップへ
      return wrapFanzaAffiliate('https://video.dmm.co.jp/av/');
    }
    const baseUrl = `https://www.dmm.co.jp/digital/videoa/-/list/search/=/searchstr=${q}/`;
    return wrapFanzaAffiliate(baseUrl);
  }

  function wrapFanzaAffiliate(targetUrl) {
    if (!FANZA_AFFILIATE_ID) return targetUrl;
    return `https://al.dmm.co.jp/?lurl=${encodeURIComponent(targetUrl)}&af_id=${encodeURIComponent(FANZA_AFFILIATE_ID)}&ch=link_tool&ch_id=${encodeURIComponent(FANZA_CHANNEL_ID)}`;
  }

  function openFanzaSearch(query) {
    const url = makeFanzaSearchUrl(query);
    // noopener 指定の window.open は成功時も null を返す仕様のため、
    // <a target="_blank"> をプログラムでクリックする方式にする。
    // この方式ならポップアップブロックされにくく、元タブも遷移しない。
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  // ===== テーマ =====
  function loadTheme() {
    return localStorage.getItem(THEME_KEY) || 'system';
  }

  function applyTheme(theme) {
    // 'system' / 'light' / 'dark'
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    // theme-color メタタグを連動（OSのステータスバー色用）
    updateThemeColorMeta(theme);
  }

  function updateThemeColorMeta(theme) {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#16181c' : '#3b6e8f');
  }

  // ===== ロック有効/無効 =====
  function isLockDisabled() {
    return localStorage.getItem(LOCK_DISABLED_KEY) === 'true';
  }

  function setLockDisabled(disabled) {
    if (disabled) {
      localStorage.setItem(LOCK_DISABLED_KEY, 'true');
    } else {
      localStorage.removeItem(LOCK_DISABLED_KEY);
    }
  }

  function isWebAuthnAvailable() {
    return typeof window.PublicKeyCredential !== 'undefined' &&
           typeof navigator.credentials !== 'undefined' &&
           typeof navigator.credentials.create === 'function';
  }

  async function isPlatformAuthAvailable() {
    if (!isWebAuthnAvailable()) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
        return false;
      }
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  // ArrayBuffer ↔ base64url
  function b64uEncode(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uDecode(str) {
    const pad = '='.repeat((4 - (str.length % 4)) % 4);
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }

  async function registerBiometric() {
    if (!isWebAuthnAvailable()) throw new Error('not-supported');
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'counter', id: location.hostname },
        user: {
          id: userId,
          name: 'counter-user',
          displayName: 'counter user',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });
    if (!credential) throw new Error('cancelled');
    saveBiometric(b64uEncode(credential.rawId));
  }

  async function authenticateBiometric() {
    const stored = loadBiometric();
    if (!stored) throw new Error('not-registered');
    if (!isWebAuthnAvailable()) throw new Error('not-supported');
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        allowCredentials: [
          { type: 'public-key', id: b64uDecode(stored.credentialId) },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (!assertion) throw new Error('cancelled');
    // ローカル完結なので署名検証は省略。生体認証通過＝同じ端末＝OKとみなす。
    return true;
  }

  // ===== 暗号 =====
  function generateSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashPin(pin, salt) {
    // crypto.subtle はセキュアコンテキスト（http(s)/localhost）でのみ動く。
    // ファイルダブルクリック起動（file://）のChrome等では使えないので簡易ハッシュへフォールバック。
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      try {
        const enc = new TextEncoder();
        const data = enc.encode(`${salt}:${pin}`);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return 'sha256:' + Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (e) {
        // fall through
      }
    }
    return 'fnv:' + simpleHash(`${salt}:${pin}`);
  }

  // FNV-1aを4本回した簡易128bit風ハッシュ。
  // 目的は「LocalStorageに平文PINを置かない」程度。覗き見対策のレベル。
  function simpleHash(str) {
    let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0xcbf29ce4, h4 = 0x84222325;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 16777619);
      h3 = Math.imul(h3 ^ c, 16777619);
      h4 = Math.imul(h4 ^ c, 16777619);
    }
    return [h1, h2, h3, h4]
      .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
      .join('');
  }

  // ===== 集計 =====
  function countThisMonth(records) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return records.filter((r) => {
      const d = new Date(r.datetime);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }

  function countThisWeek(records) {
    // 週の始まりは月曜とする
    const now = new Date();
    const day = now.getDay(); // 0=日, 1=月, ..., 6=土
    const offsetToMonday = (day + 6) % 7; // 月=0, 火=1, ..., 日=6
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetToMonday);
    return records.filter((r) => new Date(r.datetime) >= start).length;
  }

  function countToday(records) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    return records.filter((r) => {
      const dt = new Date(r.datetime);
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    }).length;
  }

  function aggregateByMonth(records, monthsBack = 6) {
    const now = new Date();
    const buckets = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${d.getMonth() + 1}月`,
        count: 0,
      });
    }
    const map = new Map(buckets.map((b) => [b.key, b]));
    records.forEach((r) => {
      const dt = new Date(r.datetime);
      const k = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (map.has(k)) map.get(k).count++;
    });
    return buckets;
  }

  function aggregateByWeekday(records) {
    const labels = ['月', '火', '水', '木', '金', '土', '日'];
    const buckets = labels.map((label) => ({ label, count: 0 }));
    records.forEach((r) => {
      const d = new Date(r.datetime).getDay(); // 0=日
      const idx = (d + 6) % 7; // 月=0...日=6
      buckets[idx].count++;
    });
    return buckets;
  }

  function aggregateByHourBand(records) {
    const labels = ['0-3', '4-7', '8-11', '12-15', '16-19', '20-23'];
    const buckets = labels.map((label) => ({ label, count: 0 }));
    records.forEach((r) => {
      const h = new Date(r.datetime).getHours();
      buckets[Math.floor(h / 4)].count++;
    });
    return buckets;
  }

  function aggregateRanking(records, field, limit = 5) {
    const counts = new Map();
    records.forEach((r) => {
      const v = (r[field] || '').trim();
      if (!v) return;
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  // 指定の who 名で最後に記録した日時を返す。なければ null。
  function getLastFapDate(name) {
    const n = (name || '').trim();
    if (!n) return null;
    const records = loadRecords();
    let latest = null;
    for (const r of records) {
      if ((r.who || '').trim() !== n) continue;
      const t = new Date(r.datetime).getTime();
      if (latest === null || t > latest) latest = t;
    }
    return latest === null ? null : new Date(latest);
  }

  // 「3日前」「2週間前」「1か月前」など、ご無沙汰感が伝わる相対日表記
  function formatRelativeDays(date) {
    if (!date) return '未';
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}か月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }

  // 過去のwho/how入力値を使用頻度順で取得（候補チップ用）
  function getValueSuggestions(field, limit = 8, excludeSet = null) {
    const records = loadRecords();
    const counts = new Map();
    records.forEach((r) => {
      const v = (r[field] || '').trim();
      if (!v) return;
      if (excludeSet && excludeSet.has(v)) return;
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([v]) => v);
  }

  // ===== 表示用ユーティリティ =====
  function formatDateTime(iso) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
  }

  function formatStamp(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}`;
  }

  // ===== 描画 =====
  function renderHome() {
    const records = loadRecords();
    document.getElementById('home-monthly-count').textContent = String(countThisMonth(records));
    document.getElementById('home-today-count').textContent = String(countToday(records));
    renderHomeFavorites();
    renderPendingWhoHint();
    renderFanzaLinks();
  }

  function renderHomeFavorites() {
    const listEl = document.getElementById('home-favorites-list');
    const emptyEl = document.getElementById('home-favorites-empty');
    if (!listEl) return;

    const favorites = loadFavorites();
    listEl.innerHTML = '';

    if (favorites.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    // 「最終シコ日が古い順 → 未記録は最後」で並べる：ご無沙汰女優を上に出す
    const decorated = favorites.map((name) => ({
      name,
      lastDate: getLastFapDate(name),
    }));
    decorated.sort((a, b) => {
      if (a.lastDate && b.lastDate) return a.lastDate - b.lastDate;
      if (!a.lastDate && !b.lastDate) return 0;
      if (!a.lastDate) return 1;
      return -1;
    });

    const frag = document.createDocumentFragment();
    decorated.forEach(({ name, lastDate }) => {
      const li = document.createElement('li');
      li.className = 'favorite-list__item';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'favorite-card';
      btn.dataset.name = name;
      btn.setAttribute('aria-label', `${name} をFANZAで検索`);

      const star = document.createElement('span');
      star.className = 'favorite-card__star';
      star.setAttribute('aria-hidden', 'true');
      star.textContent = '★';
      btn.appendChild(star);

      const nameEl = document.createElement('span');
      nameEl.className = 'favorite-card__name';
      nameEl.textContent = name;
      btn.appendChild(nameEl);

      const ago = document.createElement('span');
      ago.className = 'favorite-card__ago';
      ago.textContent = formatRelativeDays(lastDate);
      btn.appendChild(ago);

      const arrow = document.createElement('span');
      arrow.className = 'favorite-card__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      btn.appendChild(arrow);

      // タップ：FANZA検索（アフィリ経由）＋次の＋1で「誰で」に自動入力する予約をセット
      btn.addEventListener('click', () => {
        setPendingWho(name);
        renderPendingWhoHint();
        openFanzaSearch(name);
      });

      // 長押し：お気に入りから外す（500ms）
      attachLongPress(btn, () => {
        showConfirm(
          `「${name}」をお気に入りから外しますか？`,
          () => {
            removeFavorite(name);
            renderHomeFavorites();
          },
          '外す'
        );
      });

      li.appendChild(btn);
      frag.appendChild(li);
    });
    listEl.appendChild(frag);
  }

  function renderPendingWhoHint() {
    const hint = document.getElementById('home-pending-hint');
    const nameEl = document.getElementById('home-pending-name');
    if (!hint || !nameEl) return;
    const pending = getPendingWho();
    if (pending) {
      nameEl.textContent = pending;
      hint.hidden = false;
    } else {
      nameEl.textContent = '';
      hint.hidden = true;
    }
  }

  // 共通：長押し検出（タッチ＆マウス両対応、スクロールで自動キャンセル）
  function attachLongPress(el, onLongPress, ms = 500) {
    let timer = null;
    let triggered = false;
    const start = () => {
      triggered = false;
      timer = setTimeout(() => {
        triggered = true;
        onLongPress();
      }, ms);
    };
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    // 長押し成立時は通常のclickをブロック
    el.addEventListener('click', (e) => {
      if (triggered) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggered = false;
      }
    }, true);
  }

  function renderHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    const records = loadRecords()
      .slice()
      .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));

    list.innerHTML = '';

    if (records.length === 0) {
      empty.classList.remove('is-hidden');
      return;
    }
    empty.classList.add('is-hidden');

    const frag = document.createDocumentFragment();
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

      // 編集モードに入る本体クリック
      const openEdit = () => {
        const rec = findRecord(r.id);
        if (rec) Modal.open('edit', rec);
      };
      dt.addEventListener('click', openEdit);
      meta.addEventListener('click', openEdit);

      // 📤 Xシェアボタン（女優名のFANZAアフィリリンク付き）
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'history-item__share';
      shareBtn.setAttribute('aria-label', 'この記録をXにシェア');
      shareBtn.innerHTML = '<span aria-hidden="true">📤</span><span>X</span>';
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        shareRecordToX(r);
      });
      li.appendChild(shareBtn);

      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  // 履歴の1レコードをX(Twitter)にシェア（女優名のFANZAアフィリ検索URLを添付）
  function shareRecordToX(record) {
    const who = (record.who || '').trim();
    const how = (record.how || '').trim();

    // 文面の組み立て
    let text;
    if (who && how) {
      text = `${who}の${how}で賢者になりました`;
    } else if (who) {
      text = `${who}で賢者になりました`;
    } else if (how) {
      text = `${how}で賢者になりました`;
    } else {
      text = '今日も賢者になりました';
    }
    text += '\n— シコログで記録 📓';

    // URL：女優名があれば女優検索、なければジャンル検索、それも無ければシコログ自身
    let url;
    if (who) {
      url = makeFanzaSearchUrl(who);
    } else if (how) {
      url = makeFanzaSearchUrl(how);
    } else {
      url = 'https://shicolog.vercel.app/';
    }

    // ハッシュタグ：シコログ + 女優名（あれば）
    // ※ ハッシュタグに使えない記号類を除去
    const tags = ['シコログ'];
    if (who) {
      const safe = who.replace(/[^\p{L}\p{N}_]/gu, '');
      if (safe) tags.push(safe);
    }

    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(tags.join(','))}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
  }

  function makeMetaField(labelText, value) {
    const wrap = document.createElement('span');
    wrap.className = 'history-item__field';

    const label = document.createElement('span');
    label.className = 'history-item__field-label';
    label.textContent = `${labelText}：`;
    wrap.appendChild(label);

    const val = document.createElement('span');
    val.className = 'history-item__field-value';
    if (value && value.length > 0) {
      val.textContent = value;
    } else {
      val.textContent = '（なし）';
      val.classList.add('history-item__field-value--empty');
    }
    wrap.appendChild(val);

    return wrap;
  }

  // ===== タブ切替 =====
  function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.classList.toggle('tab--active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.screen').forEach((sc) => {
      sc.classList.remove('screen--active');
    });
    const target = document.getElementById(`screen-${tabName}`);
    if (target) target.classList.add('screen--active');

    if (tabName === 'home') renderHome();
    if (tabName === 'history') renderHistory();
    if (tabName === 'stats') renderStats();
    if (tabName === 'settings') {
      refreshBiometricSetting();
      refreshLockToggle();
      refreshThemeSelector();
    }
  }

  function refreshThemeSelector() {
    const current = loadTheme();
    document.querySelectorAll('.theme-option').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.theme === current);
    });
  }

  function renderStats() {
    const records = loadRecords();
    document.getElementById('stats-month-count').textContent = countThisMonth(records);
    document.getElementById('stats-week-count').textContent = countThisWeek(records);
    document.getElementById('stats-today-count').textContent = countToday(records);
    document.getElementById('stats-total-count').textContent = records.length;

    renderBarChart('stats-month-chart', aggregateByMonth(records, 6));
    renderBarChart('stats-weekday-chart', aggregateByWeekday(records));
    renderBarChart('stats-hour-chart', aggregateByHourBand(records));

    renderRanking('stats-who-ranking', aggregateRanking(records, 'who', 5));
    renderRanking('stats-how-ranking', aggregateRanking(records, 'how', 5));
  }

  // FANZA各種リンクをホーム画面にセット
  function renderFanzaLinks() {
    const entries = [
      ['link-fanza-ranking', 'https://www.dmm.co.jp/digital/videoa/-/ranking/'],
      ['link-fanza-new', 'https://www.dmm.co.jp/digital/videoa/-/list/=/sort=date/'],
      ['link-fanza-actress', 'https://osusume.dmm.co.jp/video/all/actresses/'],
      ['link-fanza-genre', 'https://www.dmm.co.jp/digital/videoa/-/genre/'],
    ];
    entries.forEach(([id, url]) => {
      const el = document.getElementById(id);
      if (el) el.href = wrapFanzaAffiliate(url);
    });
  }

  function renderBarChart(containerId, buckets) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    const max = Math.max(1, ...buckets.map((b) => b.count));
    const frag = document.createDocumentFragment();
    buckets.forEach((b) => {
      const item = document.createElement('div');
      item.className = 'bar-item';

      const value = document.createElement('div');
      value.className = 'bar-item__value';
      value.textContent = b.count > 0 ? String(b.count) : '';
      item.appendChild(value);

      const barWrap = document.createElement('div');
      barWrap.className = 'bar-item__bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'bar-item__bar';
      if (b.count === 0) bar.classList.add('bar-item__bar--zero');
      const ratio = b.count / max;
      bar.style.height = `${Math.max(4, ratio * 100)}%`;
      barWrap.appendChild(bar);
      item.appendChild(barWrap);

      const label = document.createElement('div');
      label.className = 'bar-item__label';
      label.textContent = b.label;
      item.appendChild(label);

      frag.appendChild(item);
    });
    el.appendChild(frag);
  }

  function renderRanking(containerId, items) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'ranking__empty';
      empty.textContent = 'まだ記録がありません';
      el.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'ranking__item';

      const rank = document.createElement('div');
      rank.className = 'ranking__rank';
      rank.textContent = `${i + 1}位`;
      li.appendChild(rank);

      const name = document.createElement('div');
      name.className = 'ranking__name';
      name.textContent = item.name;
      li.appendChild(name);

      const count = document.createElement('div');
      count.className = 'ranking__count';
      count.textContent = `${item.count}回`;
      li.appendChild(count);

      frag.appendChild(li);
    });
    el.appendChild(frag);
  }

  function refreshLockToggle() {
    const label = document.getElementById('lock-toggle-label');
    const hint = document.getElementById('lock-toggle-hint');
    const changePinBtn = document.getElementById('btn-change-pin');
    if (!label) return;
    const hasPin = !!loadPin();
    // PIN変更ボタンは PIN設定済みのときだけ表示
    if (changePinBtn) changePinBtn.hidden = !hasPin;
    if (!hasPin) {
      label.textContent = 'PINロックを有効化';
      hint.textContent = '現在：オフ（起動時の認証なし）。気になる方は4桁PINでロックできます';
    } else if (isLockDisabled()) {
      label.textContent = 'PINロックを有効化する';
      hint.textContent = '現在：オフ（起動時の認証なし）';
    } else {
      label.textContent = 'PINロックを無効化する';
      hint.textContent = '現在：オン（起動時にPIN/生体認証が必要）';
    }
  }

  async function refreshBiometricSetting() {
    const btn = document.getElementById('btn-toggle-biometric');
    const label = document.getElementById('biometric-label');
    const hint = document.getElementById('biometric-hint');
    if (!btn) return;

    const isEnabled = !!loadBiometric();
    if (isEnabled) {
      label.textContent = '生体認証を無効化';
      hint.textContent = 'この端末で登録済み';
      btn.disabled = false;
      return;
    }

    // PIN未設定では生体認証は使えない（PINがフォールバックとして必要）
    if (!loadPin()) {
      label.textContent = '生体認証を有効化';
      hint.textContent = '先にPINロックを有効化してください';
      btn.disabled = true;
      return;
    }

    const available = await isPlatformAuthAvailable();
    if (!available) {
      label.textContent = '生体認証は利用不可';
      hint.textContent = 'この端末・ブラウザでは使えません';
      btn.disabled = true;
    } else {
      label.textContent = '生体認証を有効化';
      hint.textContent = '指紋・顔認証で素早く解除';
      btn.disabled = false;
    }
  }

  // ===== モーダル（新規入力／編集） =====
  const Modal = {
    el: null,
    inputWho: null,
    inputHow: null,
    titleEl: null,
    datetimeEl: null,
    btnSkip: null,
    btnDelete: null,
    btnSave: null,
    mode: null,        // 'create' | 'edit'
    editingId: null,

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
    },

    renderWhoSuggestions() {
      const el = this.whoSuggestionsEl;
      el.innerHTML = '';
      // 履歴の使用頻度上位 + お気に入り（重複は除外）を候補に出す
      const favorites = loadFavorites();
      const suggestions = getValueSuggestions('who', 8);
      const merged = Array.from(new Set([...favorites, ...suggestions]));
      if (merged.length === 0) return;
      const frag = document.createDocumentFragment();
      merged.forEach((value) => {
        const wrap = document.createElement('span');
        wrap.className = 'chip-with-star';

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = value;
        chip.addEventListener('click', () => {
          this.inputWho.value = value;
          this.inputWho.focus();
        });
        wrap.appendChild(chip);

        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'chip-star';
        star.setAttribute('aria-label', `${value} をお気に入りに追加／解除`);
        const refreshStar = () => {
          const on = isFavorite(value);
          star.textContent = on ? '★' : '☆';
          star.classList.toggle('is-on', on);
        };
        refreshStar();
        star.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(value);
          refreshStar();
        });
        wrap.appendChild(star);

        frag.appendChild(wrap);
      });
      el.appendChild(frag);
    },

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

    close() {
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      this.mode = null;
      this.editingId = null;
    },

    syncChipSelection() {
      const v = this.inputHow.value;
      document.querySelectorAll('#how-presets .chip').forEach((c) => {
        c.classList.toggle('chip--selected', c.dataset.preset === v);
      });
    },

    selectPreset(value) {
      this.inputHow.value = value;
      this.syncChipSelection();
    },
  };

  // ===== 引き継ぎコードのモーダル開閉 =====
  function openSpellModal(id) {
    const el = document.getElementById(id);
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeSpellModal(id) {
    const el = document.getElementById(id);
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  // ===== 確認ダイアログ =====
  function showConfirm(message, onOk, okLabel = 'OK') {
    const dlg = document.getElementById('confirm');
    document.getElementById('confirm-message').textContent = message;
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    okBtn.textContent = okLabel;

    const close = () => {
      dlg.classList.remove('is-open');
      dlg.setAttribute('aria-hidden', 'true');
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      dlg.querySelectorAll('[data-action="cancel"]').forEach((el) => {
        el.removeEventListener('click', handleCancel);
      });
    };
    const handleOk = () => { close(); onOk(); };
    const handleCancel = () => { close(); };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    dlg.querySelectorAll('[data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', handleCancel);
    });

    dlg.classList.add('is-open');
    dlg.setAttribute('aria-hidden', 'false');
  }

  // ===== 保存／編集／削除 処理 =====
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

  function deleteFromModal() {
    const id = Modal.editingId;
    if (!id) return;
    showConfirm('この記録を削除しますか？\nこの操作は取り消せません。', () => {
      deleteRecord(id);
      Modal.close();
      renderHistory();
      renderHome();
    }, '削除');
  }

  // ===== CSVエクスポート =====
  function csvEscape(value) {
    const s = String(value ?? '');
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportCSV() {
    const records = loadRecords()
      .slice()
      .sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
    const header = ['id', 'datetime', 'who', 'how'];
    const lines = [header.join(',')];
    records.forEach((r) => {
      lines.push([r.id, r.datetime, r.who, r.how].map(csvEscape).join(','));
    });
    const csv = lines.join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `counter-export-${formatStamp(new Date())}.csv`);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ===== JSON入出力（端末間手動同期） =====
  function exportJSON() {
    const records = loadRecords();
    const favorites = loadFavorites();
    const payload = {
      app: 'count-app',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      records,
      favorites,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `counter-backup-${formatStamp(new Date())}.json`);
  }

  async function importJSON(file) {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('JSONとして読み込めませんでした');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('JSONの中身が空、または不正です');
    }
    const incoming = Array.isArray(data.records) ? data.records : null;
    if (!incoming) {
      throw new Error('records が見つかりません。counter形式のJSONではありません');
    }
    const result = mergeIncomingRecords(incoming);
    if (Array.isArray(data.favorites)) {
      mergeIncomingFavorites(data.favorites);
    }
    return result;
  }

  // 取り込み共通：既存とマージ（同IDは上書き、未存在は追加）
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

  // お気に入りのマージ（重複は無視、同じ並び順で追加）
  function mergeIncomingFavorites(incoming) {
    const valid = incoming.filter((v) => typeof v === 'string' && v.trim());
    if (valid.length === 0) return;
    const existing = loadFavorites();
    const set = new Set(existing);
    const merged = existing.slice();
    valid.forEach((v) => {
      const n = v.trim();
      if (!set.has(n)) {
        merged.push(n);
        set.add(n);
      }
    });
    saveFavorites(merged);
  }

  // ===== 引き継ぎコード（ふっかつのじゅもん） =====
  // 文字列フォーマット：CNTV1:<base64(gzip(json))>
  const SPELL_PREFIX = 'CNTV1:';

  function hasCompressionAPI() {
    return typeof CompressionStream !== 'undefined' &&
           typeof DecompressionStream !== 'undefined';
  }

  async function gzipCompress(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  async function gzipDecompress(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }

  function bytesToBase64(bytes) {
    let s = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(s);
  }

  function base64ToBytes(b64) {
    const cleaned = b64.replace(/\s+/g, '');
    const bin = atob(cleaned);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function createSpell() {
    if (!hasCompressionAPI()) {
      throw new Error('このブラウザでは引き継ぎコードを作れません（古いブラウザ）。JSONファイル方式を使ってください。');
    }
    const payload = {
      app: 'count-app',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      records: loadRecords(),
      favorites: loadFavorites(),
    };
    const json = JSON.stringify(payload);
    const compressed = await gzipCompress(json);
    const b64 = bytesToBase64(compressed);
    return {
      spell: SPELL_PREFIX + b64,
      recordCount: payload.records.length,
      originalBytes: json.length,
      compressedBytes: compressed.length,
    };
  }

  async function restoreFromSpell(spell) {
    const trimmed = (spell || '').trim();
    if (!trimmed) throw new Error('引き継ぎコードが空です');
    if (!trimmed.startsWith(SPELL_PREFIX)) {
      throw new Error('引き継ぎコードの形式が違います（CNTV1: で始まる文字列を貼り付けてください）');
    }
    if (!hasCompressionAPI()) {
      throw new Error('このブラウザでは引き継ぎコードを取り込めません（古いブラウザ）');
    }
    const b64 = trimmed.slice(SPELL_PREFIX.length);
    let compressed;
    try {
      compressed = base64ToBytes(b64);
    } catch (e) {
      throw new Error('引き継ぎコードを解読できません。コピペ漏れがあるかもしれません');
    }
    let json;
    try {
      json = await gzipDecompress(compressed);
    } catch (e) {
      throw new Error('引き継ぎコードを展開できません。コードが壊れている可能性があります');
    }
    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      throw new Error('引き継ぎコードの中身が壊れています');
    }
    if (!data || !Array.isArray(data.records)) {
      throw new Error('counter形式のデータではありません');
    }
    const result = mergeIncomingRecords(data.records);
    if (Array.isArray(data.favorites)) {
      mergeIncomingFavorites(data.favorites);
    }
    return result;
  }

  // ===== ロック =====
  const Lock = {
    el: null,
    appEl: null,
    titleEl: null,
    messageEl: null,
    errorEl: null,
    dotsEl: null,
    isUnlocked: false,
    // ステートマシン:
    // 'unlock'         : PINを入力して解除
    // 'set-new'        : 新規PIN入力（初回または変更時）
    // 'set-confirm'    : 新規PINの確認入力
    // 'change-current' : PIN変更時の現PIN確認
    state: null,
    pinBuffer: '',
    newPinDraft: '',
    onUnlockSuccess: null,

    init() {
      this.el = document.getElementById('lock-screen');
      this.appEl = document.getElementById('app');
      this.titleEl = document.getElementById('lock-title');
      this.messageEl = document.getElementById('lock-message');
      this.errorEl = document.getElementById('lock-error');
      this.dotsEl = document.getElementById('pin-display');
      this.bioBtn = document.getElementById('btn-biometric-unlock');
      this.cancelBtn = document.getElementById('btn-lock-cancel');
    },

    updateBiometricButton() {
      // 'unlock' state でかつ生体登録済みのときだけボタンを出す
      if (this.state === 'unlock' && loadBiometric()) {
        this.bioBtn.hidden = false;
      } else {
        this.bioBtn.hidden = true;
      }
    },

    async tryBiometric() {
      if (this.state !== 'unlock') return;
      if (!loadBiometric()) return;
      try {
        await authenticateBiometric();
        this.isUnlocked = true;
        this.hide();
        if (typeof this.onUnlockSuccess === 'function') {
          this.onUnlockSuccess();
          this.onUnlockSuccess = null;
        }
      } catch (e) {
        // 失敗・キャンセルはサイレント。PIN入力にフォールバック
      }
    },

    show() {
      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
      this.appEl.setAttribute('aria-hidden', 'true');
    },

    hide() {
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      this.appEl.setAttribute('aria-hidden', 'false');
    },

    setState(state) {
      this.state = state;
      this.pinBuffer = '';
      this.errorEl.textContent = '';
      this.updateDots();

      switch (state) {
        case 'unlock':
          this.titleEl.textContent = 'ロックを解除';
          this.messageEl.textContent = 'PINを入力してください';
          break;
        case 'set-new':
          this.titleEl.textContent = 'PINを設定';
          this.messageEl.textContent = '4桁の数字を入力してください';
          break;
        case 'set-confirm':
          this.titleEl.textContent = 'もう一度入力';
          this.messageEl.textContent = '確認のためもう一度入力';
          break;
        case 'change-current':
          this.titleEl.textContent = '現在のPINを入力';
          this.messageEl.textContent = 'PIN変更には現在のPINが必要です';
          break;
      }
      this.updateBiometricButton();
      this.updateCancelButton();
    },

    updateCancelButton() {
      // unlock 状態（=起動時の認証）ではキャンセル不可。設定/変更フローのみ表示
      if (!this.cancelBtn) return;
      this.cancelBtn.hidden = (this.state === 'unlock');
    },

    // PIN設定/変更フローの中断
    cancelChangePin() {
      this.pinBuffer = '';
      this.newPinDraft = '';
      this.onUnlockSuccess = null;
      const stored = loadPin();
      // PIN未設定ならロック自体が無いので unlocked 扱い
      this.isUnlocked = !stored || isLockDisabled();
      this.hide();
      switchTab('settings');
    },

    updateDots() {
      const dots = this.dotsEl.querySelectorAll('.pin-dot');
      dots.forEach((d, i) => {
        d.classList.toggle('is-filled', i < this.pinBuffer.length);
      });
    },

    shake() {
      this.dotsEl.classList.add('is-shake');
      setTimeout(() => this.dotsEl.classList.remove('is-shake'), 420);
    },

    async appendDigit(d) {
      if (this.pinBuffer.length >= PIN_LENGTH) return;
      this.pinBuffer += d;
      this.errorEl.textContent = '';
      this.updateDots();
      if (this.pinBuffer.length === PIN_LENGTH) {
        await this.handleComplete();
      }
    },

    removeDigit() {
      if (this.pinBuffer.length === 0) return;
      this.pinBuffer = this.pinBuffer.slice(0, -1);
      this.errorEl.textContent = '';
      this.updateDots();
    },

    async handleComplete() {
      const entered = this.pinBuffer;

      if (this.state === 'unlock') {
        const stored = loadPin();
        if (!stored) {
          // 想定外（PINがないのにunlock状態）→ 初期化へ
          this.setState('set-new');
          return;
        }
        const h = await hashPin(entered, stored.salt);
        if (h === stored.hash) {
          this.isUnlocked = true;
          this.hide();
          if (typeof this.onUnlockSuccess === 'function') {
            this.onUnlockSuccess();
            this.onUnlockSuccess = null;
          }
        } else {
          this.shake();
          this.pinBuffer = '';
          this.updateDots();
          this.errorEl.textContent = 'PINが違います';
        }
      } else if (this.state === 'set-new') {
        this.newPinDraft = entered;
        this.setState('set-confirm');
      } else if (this.state === 'set-confirm') {
        if (entered === this.newPinDraft) {
          const salt = generateSalt();
          const hash = await hashPin(entered, salt);
          savePin(salt, hash);
          this.newPinDraft = '';
          this.isUnlocked = true;
          this.hide();
          if (typeof this.onUnlockSuccess === 'function') {
            this.onUnlockSuccess();
            this.onUnlockSuccess = null;
          }
        } else {
          this.shake();
          this.newPinDraft = '';
          this.setState('set-new');
          this.errorEl.textContent = '一致しません。もう一度設定してください';
        }
      } else if (this.state === 'change-current') {
        const stored = loadPin();
        if (!stored) {
          this.setState('set-new');
          return;
        }
        const h = await hashPin(entered, stored.salt);
        if (h === stored.hash) {
          this.setState('set-new');
        } else {
          this.shake();
          this.pinBuffer = '';
          this.updateDots();
          this.errorEl.textContent = 'PINが違います';
        }
      }
    },

    // 起動時／再ロック時に呼ぶ。PIN未設定なら認証スキップして即アプリを開く。
    requireAuth(onSuccess) {
      this.onUnlockSuccess = onSuccess || null;
      const stored = loadPin();

      // PIN未設定、または PIN設定済み + ロック無効化中ならスキップして即解除
      if (!stored || isLockDisabled()) {
        this.isUnlocked = true;
        // ロック画面を隠し、アプリ本体を表示状態にする
        this.el.classList.remove('is-open');
        this.el.setAttribute('aria-hidden', 'true');
        this.appEl.setAttribute('aria-hidden', 'false');
        if (typeof this.onUnlockSuccess === 'function') {
          this.onUnlockSuccess();
          this.onUnlockSuccess = null;
        }
        return;
      }

      this.show();
      this.setState('unlock');
      this.isUnlocked = false;
      // 生体認証が登録済みなら自動で試す（失敗時はPIN入力にフォールバック）
      if (loadBiometric()) {
        setTimeout(() => this.tryBiometric(), 200);
      }
    },

    // PIN設定/変更フロー開始。PIN未設定なら新規設定、設定済みなら変更フロー。
    // onDone を渡すと完了後にそれが呼ばれる（未指定時はホームへ戻る）
    startChangePin(onDone) {
      const stored = loadPin();
      this.show();
      this.isUnlocked = false;
      if (!stored) {
        this.setState('set-new');
      } else {
        this.setState('change-current');
      }
      this.onUnlockSuccess = () => {
        if (typeof onDone === 'function') {
          onDone();
        } else {
          switchTab('home');
        }
      };
    },
  };

  // ===== バックグラウンド復帰での再ロック =====
  let hiddenAt = null;
  function setupAutoLock() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt && Lock.isUnlocked && !isLockDisabled()) {
          const elapsed = Date.now() - hiddenAt;
          if (elapsed > RELOCK_AFTER_MS) {
            Lock.requireAuth();
          }
        }
        hiddenAt = null;
        // FANZAから戻ってきたタイミングでホーム表示を更新（予約ヒントが出るように）
        if (document.getElementById('screen-home').classList.contains('screen--active')) {
          renderHome();
        }
      }
    });
  }

  // ===== ServiceWorker登録 =====
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // file:// では動かないので http/https のみ
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // 失敗してもアプリは動く
      });
    });
  }

  // +1ボタン：短押し／長押しの切り分け
  function setupPlusButton() {
    const btn = document.getElementById('btn-plus');
    const LONG_PRESS_MS = 500;
    let timer = null;
    let longFired = false;

    const startPress = (e) => {
      // 右クリック等は無視
      if (e.type === 'mousedown' && e.button !== 0) return;
      longFired = false;
      timer = setTimeout(() => {
        longFired = true;
        // 振動できる端末は短く振動でフィードバック
        if (navigator.vibrate) {
          try { navigator.vibrate(30); } catch (_) {}
        }
        // メモなし即記録（予約された女優名があればそれで記録）
        const pendingWho = getPendingWho();
        addRecord({ who: pendingWho, how: '' });
        clearPendingWho();
        renderHome();
        if (document.getElementById('screen-history').classList.contains('screen--active')) {
          renderHistory();
        }
        btn.classList.add('is-quickrecord');
        setTimeout(() => btn.classList.remove('is-quickrecord'), 400);
      }, LONG_PRESS_MS);
    };

    const cancelPress = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleClick = (e) => {
      // 長押しが先に発火していたらクリックは無効化
      if (longFired) {
        e.preventDefault();
        e.stopPropagation();
        longFired = false;
        return;
      }
      Modal.open('create');
    };

    btn.addEventListener('pointerdown', startPress);
    btn.addEventListener('pointerup', cancelPress);
    btn.addEventListener('pointerleave', cancelPress);
    btn.addEventListener('pointercancel', cancelPress);
    btn.addEventListener('click', handleClick);

    // 右クリックメニューを抑制（長押しでiOSのコンテキストメニュー出るのを防ぐ）
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ===== イベント登録 =====
  function bindEvents() {
    // +1 ボタン：短押し→モーダル、長押し（500ms）→ メモなし即記録
    setupPlusButton();

    // タブ
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // モーダル：閉じる
    Modal.el.querySelectorAll('[data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', () => Modal.close());
    });

    // プリセットチップ
    document.querySelectorAll('#how-presets .chip').forEach((chip) => {
      chip.addEventListener('click', () => Modal.selectPreset(chip.dataset.preset));
    });

    // FANZA検索ボタン（「誰で」「何で」入力欄横）
    document.getElementById('btn-search-who-fanza').addEventListener('click', () => {
      openFanzaSearch(Modal.inputWho.value);
    });
    // 🎲 ランダムで内蔵リストから女優名を「誰で？」欄にセット（連打で振り直し）
    document.getElementById('btn-random-who').addEventListener('click', () => {
      const current = (Modal.inputWho.value || '').trim();
      Modal.inputWho.value = getRandomActress(current);
      // 入力欄を一瞬ハイライトしてフィードバック
      Modal.inputWho.classList.add('is-random-flash');
      setTimeout(() => Modal.inputWho.classList.remove('is-random-flash'), 350);
    });
    // 🎲 ランダムで内蔵リストからジャンル名を「ジャンルは？」欄にセット
    document.getElementById('btn-random-how').addEventListener('click', () => {
      const current = (Modal.inputHow.value || '').trim();
      Modal.inputHow.value = getRandomGenre(current);
      Modal.syncChipSelection();
      Modal.inputHow.classList.add('is-random-flash');
      setTimeout(() => Modal.inputHow.classList.remove('is-random-flash'), 350);
    });
    document.getElementById('btn-search-how-fanza').addEventListener('click', () => {
      openFanzaSearch(Modal.inputHow.value);
    });

    // 「何で」自由入力時にチップの選択状態を同期
    Modal.inputHow.addEventListener('input', () => Modal.syncChipSelection());

    // 保存／スキップ／削除
    Modal.btnSave.addEventListener('click', () => commitFromModal({ skipMemo: false }));
    Modal.btnSkip.addEventListener('click', () => commitFromModal({ skipMemo: true }));
    Modal.btnDelete.addEventListener('click', () => deleteFromModal());

    // Escapeでモーダルを閉じる（PC用）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && Modal.el.classList.contains('is-open')) {
        Modal.close();
      }
    });

    // 設定画面
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      exportCSV();
    });
    document.getElementById('btn-delete-all').addEventListener('click', () => {
      showConfirm(
        '本当に全データを削除しますか？\n記録もPIN設定も生体認証もすべて消えます。',
        () => {
          clearAllRecords();
          localStorage.removeItem(PIN_KEY);
          clearBiometric();
          setLockDisabled(false);
          // 初回起動と同じ状態へ
          location.reload();
        },
        '削除'
      );
    });
    document.getElementById('btn-change-pin').addEventListener('click', () => {
      Lock.startChangePin(() => switchTab('settings'));
    });

    // 生体認証ボタン（ロック画面）
    document.getElementById('btn-biometric-unlock').addEventListener('click', () => {
      Lock.tryBiometric();
    });

    // ロック画面のキャンセル（PIN設定／変更フローのみ表示される）
    document.getElementById('btn-lock-cancel').addEventListener('click', () => {
      Lock.cancelChangePin();
    });

    // 「予約中」ヒントの取り消し（ホーム画面）
    document.getElementById('btn-cancel-pending').addEventListener('click', () => {
      clearPendingWho();
      renderPendingWhoHint();
    });

    // ===== シェア機能 =====
    const SHARE_URL = 'https://shicolog.vercel.app/';
    const SHARE_TEXT = 'あなたはどこまで賢者になれるのか？\nシコログ — 射精をこっそり記録するアプリ';

    document.getElementById('btn-share-x').addEventListener('click', () => {
      const url = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}&hashtags=シコログ`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    document.getElementById('btn-share-line').addEventListener('click', () => {
      const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(SHARE_URL)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    document.getElementById('btn-share-copy').addEventListener('click', async () => {
      const btn = document.getElementById('btn-share-copy');
      const label = document.getElementById('share-copy-label');
      const textToCopy = `${SHARE_TEXT}\n${SHARE_URL}`;
      let ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
          ok = true;
        } else {
          // フォールバック：旧来の execCommand 方式
          const ta = document.createElement('textarea');
          ta.value = textToCopy;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand('copy');
          document.body.removeChild(ta);
        }
      } catch (e) {
        ok = false;
      }
      if (ok) {
        btn.classList.add('is-copied');
        label.textContent = 'コピーしました！';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          label.textContent = 'URLをコピー';
        }, 1800);
      } else {
        label.textContent = 'コピー失敗';
        setTimeout(() => { label.textContent = 'URLをコピー'; }, 1800);
      }
    });

    // テーマ切替
    document.querySelectorAll('.theme-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        refreshThemeSelector();
      });
    });

    // OSのテーマ変更を 'system' 設定時に追従
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (loadTheme() === 'system') updateThemeColorMeta('system');
      };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }

    // ロック有効/無効トグル
    document.getElementById('btn-toggle-lock').addEventListener('click', () => {
      const hasPin = !!loadPin();
      if (!hasPin) {
        // PIN未設定 → PIN設定フローへ。完了後は設定画面に戻りトグル表示を更新
        Lock.startChangePin(() => {
          setLockDisabled(false);
          switchTab('settings');
        });
        return;
      }
      if (isLockDisabled()) {
        // 再度有効化（警告不要）
        setLockDisabled(false);
        refreshLockToggle();
      } else {
        showConfirm(
          'PINロックを無効化しますか？\n他人が端末を触ったときにデータが見えてしまいます。本当に無効化しますか？\n（PINはそのまま保存され、いつでも再有効化できます）',
          () => {
            setLockDisabled(true);
            refreshLockToggle();
          },
          '無効化'
        );
      }
    });

    // 引き継ぎコード：作る
    document.getElementById('btn-create-spell').addEventListener('click', async () => {
      try {
        const result = await createSpell();
        const ta = document.getElementById('spell-export-text');
        ta.value = result.spell;
        document.getElementById('spell-export-info').textContent =
          `${result.recordCount}件 / 文字数：${result.spell.length}`;
        openSpellModal('spell-export');
        // モバイル含めて選択しておくとコピーしやすい
        setTimeout(() => ta.select(), 50);
      } catch (e) {
        showConfirm(`引き継ぎコードを作れませんでした\n${e.message}`, () => {}, '閉じる');
      }
    });

    // 引き継ぎコード：コピー
    document.getElementById('btn-spell-copy').addEventListener('click', async () => {
      const ta = document.getElementById('spell-export-text');
      const text = ta.value;
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (e) {
        // fallback to selection
      }
      if (!copied) {
        ta.focus();
        ta.select();
        try {
          copied = document.execCommand && document.execCommand('copy');
        } catch (e) {}
      }
      const btn = document.getElementById('btn-spell-copy');
      const orig = btn.textContent;
      btn.textContent = copied ? 'コピーしました' : 'コピーできませんでした。長押し→全選択→コピーしてください';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });

    // 引き継ぎコード：取り込みモーダルを開く
    document.getElementById('btn-restore-spell').addEventListener('click', () => {
      document.getElementById('spell-import-text').value = '';
      openSpellModal('spell-import');
    });

    // 引き継ぎコード：貼り付けボタン
    document.getElementById('btn-spell-paste').addEventListener('click', async () => {
      const ta = document.getElementById('spell-import-text');
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          ta.value = text;
          return;
        }
      } catch (e) {
        // fallthrough
      }
      ta.focus();
      showConfirm('クリップボードへのアクセスが拒否されました。\nテキストエリアに長押し→ペーストで貼り付けてください。', () => {}, '閉じる');
    });

    // 引き継ぎコード：取り込む
    document.getElementById('btn-spell-restore').addEventListener('click', async () => {
      const ta = document.getElementById('spell-import-text');
      try {
        const r = await restoreFromSpell(ta.value);
        closeSpellModal('spell-import');
        renderHome();
        if (document.getElementById('screen-history').classList.contains('screen--active')) {
          renderHistory();
        }
        showConfirm(
          `取り込み完了\n追加：${r.added}件\n更新：${r.updated}件\n合計：${r.total}件`,
          () => {},
          '閉じる'
        );
      } catch (e) {
        showConfirm(`取り込みエラー\n${e.message}`, () => {}, '閉じる');
      }
    });

    // モーダル汎用：閉じるボタン
    document.querySelectorAll('#spell-export [data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', () => closeSpellModal('spell-export'));
    });
    document.querySelectorAll('#spell-import [data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', () => closeSpellModal('spell-import'));
    });

    // JSON書き出し（端末間同期用）
    document.getElementById('btn-export-json').addEventListener('click', () => {
      exportJSON();
    });

    // JSON読み込み
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('file-import-json').click();
    });
    document.getElementById('file-import-json').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ''; // 同じファイルを連続選択できるようにリセット
      if (!file) return;
      showConfirm(
        `「${file.name}」を取り込みますか？\n既存データと比較して、ID一致は上書き、未存在のIDは追加します。`,
        async () => {
          try {
            const r = await importJSON(file);
            renderHome();
            if (document.getElementById('screen-history').classList.contains('screen--active')) {
              renderHistory();
            }
            showConfirm(
              `読み込み完了\n追加：${r.added}件\n更新：${r.updated}件\n合計：${r.total}件`,
              () => {},
              '閉じる'
            );
          } catch (err) {
            showConfirm(`読み込みエラー\n${err.message}`, () => {}, '閉じる');
          }
        },
        '取り込む'
      );
    });

    // 生体認証の有効化／無効化（設定画面）
    document.getElementById('btn-toggle-biometric').addEventListener('click', async () => {
      const btn = document.getElementById('btn-toggle-biometric');
      const isEnabled = !!loadBiometric();
      if (isEnabled) {
        showConfirm('生体認証を無効化しますか？\n（PINでのロック解除はそのまま使えます）', () => {
          clearBiometric();
          refreshBiometricSetting();
        }, '無効化');
        return;
      }

      // 有効化フロー
      const available = await isPlatformAuthAvailable();
      if (!available) {
        showConfirm('この端末では生体認証が利用できません。\n（生体センサーがない、またはOSの設定が必要です）', () => {}, '閉じる');
        return;
      }
      btn.disabled = true;
      try {
        await registerBiometric();
        refreshBiometricSetting();
      } catch (e) {
        showConfirm('生体認証の登録に失敗しました。\nキャンセル、またはOS側の設定で許可されていない可能性があります。', () => {}, '閉じる');
      } finally {
        btn.disabled = false;
      }
    });

    // PINキーパッド
    document.querySelectorAll('#pin-keypad .pin-key').forEach((key) => {
      key.addEventListener('click', () => {
        const k = key.dataset.key;
        if (!k) return;
        if (k === 'del') {
          Lock.removeDigit();
        } else {
          Lock.appendDigit(k);
        }
      });
    });

    // 物理キーボードでも入力できるように（PC操作用）
    document.addEventListener('keydown', (e) => {
      if (!Lock.el.classList.contains('is-open')) return;
      if (/^[0-9]$/.test(e.key)) {
        Lock.appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        Lock.removeDigit();
      } else if (e.key === 'Escape' && Lock.state !== 'unlock') {
        Lock.cancelChangePin();
      }
    });
  }

  // ===== 起動 =====
  function init() {
    // テーマは最優先で適用（ロック画面より前に色が決まるように）
    applyTheme(loadTheme());

    Modal.init();
    Lock.init();
    bindEvents();
    setupAutoLock();
    registerServiceWorker();

    Lock.requireAuth(() => {
      renderHome();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

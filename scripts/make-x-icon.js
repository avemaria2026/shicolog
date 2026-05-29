// シコログXプロフィール用アイコン生成スクリプト（400x400 PNG）
// 既存の icon.svg をベースに、X表示用に少しコントラスト/陰影を強化したPNGを書き出す。
//
// 使い方：
//   node scripts/make-x-icon.js
//   → assets/x-icon-shicolog-400.png に出力される
//
// 生成後、XのプロフィールでこのPNGをアップロードする。

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// シコログXアイコン用SVG
// - 既存アプリアイコンと同じ青背景＋白い＋マーク（ブランド統一）
// - 角丸を少し緩めて視認性向上、+マークに微細な影を入れて立体感
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#447ea3"/>
      <stop offset="100%" stop-color="#2e5a76"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="0" dy="4" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g fill="#ffffff" filter="url(#shadow)">
    <rect x="226" y="116" width="60" height="280" rx="12"/>
    <rect x="116" y="226" width="280" height="60" rx="12"/>
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  background: 'rgba(0,0,0,0)',
  fitTo: { mode: 'width', value: 400 },
});

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'x-icon-shicolog-400.png');
fs.writeFileSync(outPath, resvg.render().asPng());

console.log(`✅ wrote ${outPath}`);
console.log(`   size: ${fs.statSync(outPath).size} bytes`);

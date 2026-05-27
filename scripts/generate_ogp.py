# -*- coding: utf-8 -*-
"""
シコログのOGP画像（Twitter Card用）を生成するスクリプト。
1200x630のPNGを src/ogp.png として出力する。

依存：Pillow
使い方：python scripts/generate_ogp.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

# 設計
W, H = 1200, 630
BG_COLOR = (59, 110, 143)         # var(--accent) = #3b6e8f
ACCENT_LIGHT = (245, 166, 35)     # お気に入りの黄色アクセント
WHITE = (255, 255, 255)
SUBTITLE = (220, 230, 240)

# PIL は Variable Font のレンダリングが不安定なので、静的TTCのYu Gothic Boldを使う
FONT_BOLD = "C:/Windows/Fonts/YuGothB.ttc"
FONT_REGULAR = "C:/Windows/Fonts/YuGothM.ttc"

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "ogp.png")
OUT_PATH = os.path.normpath(OUT_PATH)


def make_image():
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # うっすらグラデーション風：右下に少し暗い円を重ねる
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse((W * 0.55, H * 0.3, W * 1.4, H * 1.4), fill=(0, 0, 0, 50))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # 上部に「📓 シコログ」ロゴ
    # 絵文字は埋め込めないので「📓」相当の図形描画 or テキストでロゴ表現
    # 文字だけで表現する：「📓」を別フォント or 省略
    # シンプルに「シコログ」を大きく中央配置

    # メインタイトル
    title_font = ImageFont.truetype(FONT_BOLD, 140)
    title = "シコログ"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = (H - th) // 2 - 50
    # 影
    draw.text((tx + 4, ty + 4), title, font=title_font, fill=(0, 0, 0, 80))
    draw.text((tx, ty), title, font=title_font, fill=WHITE)

    # サブタイトル
    sub_font = ImageFont.truetype(FONT_REGULAR, 48)
    subtitle = "あなたはどこまで賢者になれるのか？？"
    bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sw = bbox[2] - bbox[0]
    sx = (W - sw) // 2
    sy = ty + th + 60
    draw.text((sx, sy), subtitle, font=sub_font, fill=SUBTITLE)

    # 下部に小さいキャプション
    cap_font = ImageFont.truetype(FONT_REGULAR, 32)
    caption = "射精をこっそり記録するプライベートカウンター"
    bbox = draw.textbbox((0, 0), caption, font=cap_font)
    cw = bbox[2] - bbox[0]
    cx = (W - cw) // 2
    cy = H - 90
    draw.text((cx, cy), caption, font=cap_font, fill=ACCENT_LIGHT)

    # 余白用の細い装飾線（上下）
    line_color = (255, 255, 255, 60)
    draw.rectangle((80, 80, W - 80, 84), fill=WHITE)
    draw.rectangle((80, H - 84, W - 80, H - 80), fill=WHITE)

    img.save(OUT_PATH, "PNG", optimize=True)
    print(f"Wrote: {OUT_PATH}")
    print(f"Size:  {os.path.getsize(OUT_PATH)} bytes")


if __name__ == "__main__":
    make_image()

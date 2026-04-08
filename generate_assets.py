"""Generate Beings profile icon and X banner as PNG files."""

from PIL import Image, ImageDraw, ImageFont
import math, os

# ── Palette ────────────────────────────────────────────────
BG        = (14, 26, 26)          # #0e1a1a
TEAL_DEEP = (30, 80, 80)          # deep ring
TEAL_MID  = (45, 120, 110)        # mid ring
TEAL_BRIGHT = (72, 168, 150)      # bright accent
CREAM     = (232, 224, 208)       # #e8e0d0
SAGE      = (122, 158, 126)       # #7a9e7e

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def hex_to_rgba(h, a=255):
    h = h.lstrip('#')
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    return (r, g, b, a)


def draw_glow_circle(draw, cx, cy, radius, color_rgb, steps=60, max_alpha=60):
    """Paint a radial glow by stacking translucent ellipses."""
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        alpha = int(max_alpha * (1 - i / steps) ** 1.4)
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(*color_rgb, alpha)
        )


def draw_ring(draw, cx, cy, radius, width, color_rgb, alpha=255):
    outer = radius
    inner = radius - width
    draw.ellipse([cx-outer, cy-outer, cx+outer, cy+outer],
                 outline=(*color_rgb, alpha), width=width)


# ══════════════════════════════════════════════════════════════
#  PROFILE ICON  400 × 400
# ══════════════════════════════════════════════════════════════
def make_profile(path, size=400):
    img = Image.new('RGBA', (size, size), (*BG, 255))
    draw = ImageDraw.Draw(img, 'RGBA')
    cx, cy = size // 2, size // 2

    # Outer glow pools
    draw_glow_circle(draw, cx, cy, 195, TEAL_DEEP,   steps=80, max_alpha=90)
    draw_glow_circle(draw, cx, cy, 130, TEAL_MID,    steps=60, max_alpha=70)
    draw_glow_circle(draw, cx, cy,  70, TEAL_BRIGHT, steps=50, max_alpha=55)

    # Concentric rings
    draw_ring(draw, cx, cy, 178, 1, TEAL_MID,    alpha=60)
    draw_ring(draw, cx, cy, 148, 1, TEAL_MID,    alpha=90)
    draw_ring(draw, cx, cy, 110, 2, TEAL_BRIGHT, alpha=130)
    draw_ring(draw, cx, cy,  72, 1, TEAL_BRIGHT, alpha=80)

    # Small accent dots on the outermost ring
    num_dots = 12
    for i in range(num_dots):
        angle = 2 * math.pi * i / num_dots - math.pi / 2
        dx = cx + 178 * math.cos(angle)
        dy = cy + 178 * math.sin(angle)
        r = 2 if i % 3 == 0 else 1
        alpha = 180 if i % 3 == 0 else 80
        draw.ellipse([dx-r, dy-r, dx+r, dy+r], fill=(*TEAL_BRIGHT, alpha))

    # BEINGS text
    font_size = 62
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "BEINGS"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 4), text, font=font, fill=(*CREAM, 240))

    # Thin rule beneath text
    rule_w = tw + 16
    rule_y = cy + th // 2 + 10
    draw.line([(cx - rule_w//2, rule_y), (cx + rule_w//2, rule_y)],
              fill=(*SAGE, 140), width=1)

    # Flatten RGBA onto solid BG so no transparency leaks through
    flat = Image.new('RGB', img.size, BG)
    flat.paste(img, mask=img.split()[3])
    flat.save(path, 'PNG')
    print(f"  Saved: {path}  ({size}×{size})")


# ══════════════════════════════════════════════════════════════
#  X BANNER  1500 × 500
# ══════════════════════════════════════════════════════════════
def make_banner(path, w=1500, h=500):
    img = Image.new('RGBA', (w, h), (*BG, 255))
    draw = ImageDraw.Draw(img, 'RGBA')

    # Left glow anchor (behind text)
    draw_glow_circle(draw, 420, h//2, 340, TEAL_DEEP,   steps=100, max_alpha=80)
    draw_glow_circle(draw, 420, h//2, 200, TEAL_MID,    steps=70,  max_alpha=60)
    draw_glow_circle(draw, 420, h//2, 100, TEAL_BRIGHT, steps=50,  max_alpha=45)

    # Right subtle glow
    draw_glow_circle(draw, w - 200, h//2 + 40, 260, TEAL_DEEP, steps=80, max_alpha=45)
    draw_glow_circle(draw, w - 200, h//2 + 40, 130, TEAL_MID,  steps=60, max_alpha=30)

    # Concentric rings (left cluster)
    cx, cy = 420, h // 2
    for radius, alpha in [(320, 25), (260, 40), (200, 60), (140, 90), (88, 70)]:
        draw_ring(draw, cx, cy, radius, 1, TEAL_MID, alpha=alpha)
    draw_ring(draw, cx, cy, 200, 2, TEAL_BRIGHT, alpha=110)

    # Small accent dots on 200-radius ring
    num_dots = 24
    for i in range(num_dots):
        angle = 2 * math.pi * i / num_dots - math.pi / 2
        dx = cx + 200 * math.cos(angle)
        dy = cy + 200 * math.sin(angle)
        r = 2 if i % 4 == 0 else 1
        a = 160 if i % 4 == 0 else 60
        draw.ellipse([dx-r, dy-r, dx+r, dy+r], fill=(*TEAL_BRIGHT, a))

    # Thin horizontal rule across full width (very subtle)
    draw.line([(0, h//2), (w, h//2)], fill=(*TEAL_DEEP, 30), width=1)

    # BEINGS headline
    try:
        font_main = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 96)
        font_tag  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-ExtraLight.ttf", 26)
    except Exception:
        try:
            font_main = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 96)
            font_tag  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
        except Exception:
            font_main = ImageFont.load_default()
            font_tag  = font_main

    text_x = 740  # right half

    main_text = "BEINGS"
    mb = draw.textbbox((0, 0), main_text, font=font_main)
    mw, mh = mb[2] - mb[0], mb[3] - mb[1]
    my = h // 2 - mh // 2 - 22

    # Subtle shadow
    draw.text((text_x + 2, my + 2), main_text, font=font_main, fill=(*BG, 200))
    draw.text((text_x, my), main_text, font=font_main, fill=(*CREAM, 245))

    # Rule under main text
    rule_y = my + mh + 14
    draw.line([(text_x, rule_y), (text_x + mw, rule_y)],
              fill=(*SAGE, 120), width=1)

    # Tagline
    tag_text = "you are already whole"
    tb = draw.textbbox((0, 0), tag_text, font=font_tag)
    tw = tb[2] - tb[0]
    tag_y = rule_y + 20

    # Letter-spaced effect: draw char by char with extra gap
    spacing = 4
    char_x = text_x
    for ch in tag_text:
        cb = draw.textbbox((0, 0), ch, font=font_tag)
        draw.text((char_x, tag_y), ch, font=font_tag, fill=(*SAGE, 200))
        char_x += (cb[2] - cb[0]) + spacing

    # Flatten RGBA onto solid BG so no transparency leaks through
    flat = Image.new('RGB', img.size, BG)
    flat.paste(img, mask=img.split()[3])
    flat.save(path, 'PNG')
    print(f"  Saved: {path}  ({w}×{h})")


if __name__ == '__main__':
    profile_path = os.path.join(OUT_DIR, 'beings-profile.png')
    banner_path  = os.path.join(OUT_DIR, 'beings-x-banner.png')

    print("Generating Beings assets…")
    make_profile(profile_path)
    make_banner(banner_path)
    print("Done.")

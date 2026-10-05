#!/usr/bin/env python3
"""Render installer artwork from Yutaka's real icon and theme (requires Pillow)."""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("assets")
SURFACE = "#13181D"
OUTLINE = "#272F35"
ACCENT = "#00BD91"
TEXT = "#F3F5F6"
MUTED = "#ADB5BB"


def font(size, bold=False):
    # Optional Inter paths allow brand typography when rendering on a design host.
    names = ("Inter-Bold.ttf", "DejaVuSans-Bold.ttf") if bold else ("Inter-Regular.ttf", "DejaVuSans.ttf")
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    raise RuntimeError("Install Inter or DejaVu Sans to regenerate installer artwork.")


def paste_icon(image, box):
    icon = Image.open(ROOT / "assets/icons/app_icon.png").convert("RGBA")
    icon.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    image.paste(icon, (box[0], box[1]), icon)


def finance_graph():
    # Supersampling keeps the curve and rounded surface clean at desktop DPI.
    scale = 4
    image = Image.new("RGBA", (180 * scale, 108 * scale), SURFACE)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 180 * scale - 1, 108 * scale - 1),
                           radius=18 * scale, fill="#14191E", outline=OUTLINE, width=scale)
    segments = [
        ((14, 81), (28, 81), (35, 65), (48, 65)),
        ((48, 65), (63, 65), (68, 72), (83, 68)),
        ((83, 68), (102, 63), (100, 45), (121, 43)),
        ((121, 43), (137, 41), (146, 30), (165, 26)),
    ]
    points = []
    for segment in segments:
        for step in range(41):
            t = step / 40
            weights = ((1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3)
            points.append(tuple(scale * sum(weight * point[axis] for weight, point in zip(weights, segment))
                                for axis in (0, 1)))

    mask = Image.new("L", image.size)
    ImageDraw.Draw(mask).polygon(points + [(165 * scale, 94 * scale), (14 * scale, 94 * scale)], fill=255)
    fill = Image.new("RGBA", image.size)
    fill_draw = ImageDraw.Draw(fill)
    for y in range(26 * scale, 94 * scale):
        alpha = round(36 * (94 * scale - y) / (68 * scale))
        fill_draw.line((0, y, image.width, y), fill=(0, 189, 145, alpha))
    fill.putalpha(ImageChops.multiply(fill.getchannel("A"), mask))
    image = Image.alpha_composite(image, fill)

    glow = Image.new("RGBA", image.size)
    ImageDraw.Draw(glow).line(points, fill=(0, 189, 145, 70), width=5 * scale)
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(3 * scale)))
    draw = ImageDraw.Draw(image)
    draw.line(points, fill=ACCENT, width=3 * scale)
    draw.ellipse((161 * scale, 22 * scale, 169 * scale, 30 * scale), fill=ACCENT)
    draw.ellipse((163 * scale, 24 * scale, 167 * scale, 28 * scale), fill=TEXT)
    return image.convert("RGB").resize((180, 108), Image.Resampling.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sidebar = Image.new("RGB", (244, 563), SURFACE)
    draw = ImageDraw.Draw(sidebar)
    paste_icon(sidebar, (32, 42, 92, 92))
    draw.text((32, 156), "Yutaka", font=font(30, True), fill=TEXT)
    draw.text((32, 216), "Your finances,", font=font(16), fill=MUTED)
    draw.text((32, 241), "in your control.", font=font(16), fill=MUTED)
    sidebar.paste(finance_graph(), (32, 292))
    draw.text((32, 475), "LOCAL FIRST · PRIVATE", font=font(11, True), fill=ACCENT)
    draw.text((32, 508), "Windows desktop", font=font(13), fill=MUTED)
    sidebar.save(OUT / "windows-sidebar.bmp")

    small = Image.new("RGB", (110, 110), SURFACE)
    paste_icon(small, (0, 0, 110, 110))
    small.save(OUT / "windows-icon.bmp")

    print(f"Rendered installer artwork in {OUT}")


if __name__ == "__main__":
    main()

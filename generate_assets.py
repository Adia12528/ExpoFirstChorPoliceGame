import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def create_radar_icon(size=1024):
    # Main canvas with rich deep dark background: dark navy/midnight #0A0E1A to dark slate #121829
    img = Image.new("RGBA", (size, size), (10, 14, 26, 255))
    draw = ImageDraw.Draw(img)

    # Gradient radial backdrop
    center_x, center_y = size // 2, size // 2
    max_r = int(size * 0.46)

    # Subtle glowing ambient radial lights (Cyan on bottom-right, Crimson on top-left)
    glow_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_canvas)
    
    # Red/Crimson glow (Police / Danger) on top-left
    glow_draw.ellipse([size * 0.05, size * 0.05, size * 0.65, size * 0.65], fill=(239, 68, 68, 45))
    # Cyan glow (Radar / High-tech) on bottom-right
    glow_draw.ellipse([size * 0.35, size * 0.35, size * 0.95, size * 0.95], fill=(6, 182, 212, 50))
    # Gold glow (Loot) in center
    glow_draw.ellipse([size * 0.35, size * 0.35, size * 0.65, size * 0.65], fill=(245, 158, 11, 40))
    
    glow_canvas = glow_canvas.filter(ImageFilter.GaussianBlur(radius=80))
    img.alpha_composite(glow_canvas)
    draw = ImageDraw.Draw(img)

    # Outer Shield / Circle with metallic border
    pad = 40
    # Outer neon border
    draw.ellipse([pad - 4, pad - 4, size - pad + 4, size - pad + 4], outline=(56, 189, 248, 120), width=6)
    draw.ellipse([pad, pad, size - pad, size - pad], outline=(30, 41, 59, 255), width=10)

    # Concentric Radar rings
    r_levels = [0.16, 0.28, 0.38, 0.45]
    for r_pct in r_levels:
        r = int(size * r_pct)
        bbox = [center_x - r, center_y - r, center_x + r, center_y + r]
        draw.ellipse(bbox, outline=(14, 165, 233, 70), width=3)

    # Crosshair grid lines
    line_box = [center_x - int(size * 0.45), center_y - int(size * 0.45),
                center_x + int(size * 0.45), center_y + int(size * 0.45)]
    # Horizontal line
    draw.line([line_box[0], center_y, line_box[2], center_y], fill=(14, 165, 233, 60), width=2)
    # Vertical line
    draw.line([center_x, line_box[1], center_x, line_box[3]], fill=(14, 165, 233, 60), width=2)

    # Sweeping radar beam (pie slice / polygon with gradient effect)
    sweep_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sweep_draw = ImageDraw.Draw(sweep_canvas)
    
    sweep_angle_start = 300
    sweep_angle_end = 350
    # Draw arc fan
    for i, angle in enumerate(range(sweep_angle_start, sweep_angle_end)):
        alpha = int(180 * (i / (sweep_angle_end - sweep_angle_start)))
        rad = math.radians(angle)
        x2 = center_x + int(max_r * math.cos(rad))
        y2 = center_y + int(max_r * math.sin(rad))
        sweep_draw.line([center_x, center_y, x2, y2], fill=(6, 182, 212, alpha), width=5)

    sweep_canvas = sweep_canvas.filter(ImageFilter.GaussianBlur(radius=8))
    img.alpha_composite(sweep_canvas)
    draw = ImageDraw.Draw(img)

    # 1. Police Siren Beacon (Top Left Quadrant)
    # Police Flashing Beacon Light: base + dome + glowing pulses
    siren_x = int(center_x - size * 0.18)
    siren_y = int(center_y - size * 0.14)
    s_r = 55
    # Red Siren Aura
    siren_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sg_draw = ImageDraw.Draw(siren_glow)
    sg_draw.ellipse([siren_x - 90, siren_y - 90, siren_x + 90, siren_y + 90], fill=(239, 68, 68, 140))
    sg_draw.ellipse([siren_x - 50, siren_y - 50, siren_x + 50, siren_y + 50], fill=(255, 255, 255, 180))
    siren_glow = siren_glow.filter(ImageFilter.GaussianBlur(radius=30))
    img.alpha_composite(siren_glow)
    draw = ImageDraw.Draw(img)

    # Siren Dome base
    draw.rectangle([siren_x - 34, siren_y + 12, siren_x + 34, siren_y + 35], fill=(30, 41, 59, 255), outline=(148, 163, 184, 255), width=3)
    # Siren Dome (arc)
    draw.chord([siren_x - 30, siren_y - 30, siren_x + 30, siren_y + 30], start=180, end=360, fill=(239, 68, 68, 255), outline=(254, 202, 202, 255), width=4)
    # Glass reflection
    draw.arc([siren_x - 22, siren_y - 22, siren_x + 22, siren_y + 22], start=210, end=270, fill=(255, 255, 255, 230), width=4)

    # 2. Chor Loot Sack / Gold Coin (Bottom Right Quadrant)
    loot_x = int(center_x + size * 0.20)
    loot_y = int(center_y + size * 0.16)
    
    # Gold Glow
    loot_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    lg_draw = ImageDraw.Draw(loot_glow)
    lg_draw.ellipse([loot_x - 80, loot_y - 80, loot_x + 80, loot_y + 80], fill=(245, 158, 11, 140))
    loot_glow = loot_glow.filter(ImageFilter.GaussianBlur(radius=25))
    img.alpha_composite(loot_glow)
    draw = ImageDraw.Draw(img)

    # Money Bag / Gold Emblem
    # Sack body
    draw.ellipse([loot_x - 38, loot_y - 20, loot_x + 38, loot_y + 45], fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=4)
    # Sack neck
    draw.polygon([(loot_x - 22, loot_y - 15), (loot_x + 22, loot_y - 15), (loot_x + 12, loot_y - 32), (loot_x - 12, loot_y - 32)], fill=(180, 83, 9, 255), outline=(251, 191, 36, 255))
    # Sack tie rope
    draw.line([loot_x - 18, loot_y - 15, loot_x + 18, loot_y - 15], fill=(254, 240, 138, 255), width=5)
    # Dollar / Rupee / Loot symbol in center of sack
    try:
        font_sym = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 36)
        draw.text((loot_x, loot_y + 12), "₹", fill=(255, 255, 255, 240), font=font_sym, anchor="mm")
    except Exception:
        draw.ellipse([loot_x - 10, loot_y + 2, loot_x + 10, loot_y + 22], fill=(255, 255, 255, 240))

    # 3. Dynamic Center Radar Blip & Compass Rose
    # Center target cursor
    draw.ellipse([center_x - 14, center_y - 14, center_x + 14, center_y + 14], fill=(56, 189, 248, 255), outline=(255, 255, 255, 255), width=3)
    # Center ping ring
    draw.ellipse([center_x - 30, center_y - 30, center_x + 30, center_y + 30], outline=(56, 189, 248, 160), width=2)

    # 4. Neon Title Plate at Bottom: "CHOR-POLICE" and "LIVE"
    plate_w = int(size * 0.72)
    plate_h = 135
    plate_x1 = (size - plate_w) // 2
    plate_y1 = size - 195
    plate_x2 = plate_x1 + plate_w
    plate_y2 = plate_y1 + plate_h

    # Plate shadow and background
    draw.rounded_rectangle([plate_x1 - 4, plate_y1 - 4, plate_x2 + 4, plate_y2 + 4], radius=24, fill=(15, 23, 42, 230), outline=(56, 189, 248, 180), width=3)
    draw.rounded_rectangle([plate_x1, plate_y1, plate_x2, plate_y2], radius=20, fill=(10, 14, 26, 245))

    # Typography
    font_bold = None
    font_live = None
    for fn in ["impact.ttf", "segoeuib.ttf", "verdanab.ttf", "arial.ttf"]:
        fp = os.path.join(r"C:\Windows\Fonts", fn)
        if os.path.exists(fp):
            try:
                font_bold = ImageFont.truetype(fp, 56)
                font_live = ImageFont.truetype(fp, 36)
                break
            except Exception:
                pass
    if not font_bold:
        font_bold = ImageFont.load_default()
        font_live = font_bold

    # Draw "CHOR ⚔️ POLICE" or "CHOR-POLICE"
    # Gradient/glow effect for text
    title_text = "CHOR • POLICE"
    draw.text((size // 2, plate_y1 + 44), title_text, fill=(248, 250, 252, 255), font=font_bold, anchor="mm")
    
    # "LIVE" badge in vibrant neon red with pulsing dot
    badge_w = 110
    badge_h = 32
    badge_x = (size - badge_w) // 2
    badge_y = plate_y1 + 86
    draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=8, fill=(220, 38, 38, 255))
    # Live dot
    draw.ellipse([badge_x + 12, badge_y + 11, badge_x + 22, badge_y + 21], fill=(255, 255, 255, 255))
    draw.text((badge_x + 60, badge_y + 15), "LIVE", fill=(255, 255, 255, 255), font=font_live, anchor="mm")

    return img

def create_adaptive_foreground(size=1024):
    # Android adaptive icon foreground (centered 66% area)
    # Android masks outer 33%, safe area is inside circle of radius size * 0.33
    icon = create_radar_icon(size)
    # We create a transparent canvas and paste a nicely scaled element
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Scale icon slightly to fit safe area (72% size)
    scaled_size = int(size * 0.82)
    scaled = icon.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
    pos = ((size - scaled_size) // 2, (size - scaled_size) // 2)
    fg.paste(scaled, pos, scaled)
    return fg

def create_adaptive_background(size=1024):
    img = Image.new("RGBA", (size, size), (10, 14, 26, 255))
    draw = ImageDraw.Draw(img)
    # Subtle radial pattern
    for r in range(size // 2, 0, -20):
        alpha = int(35 * (1 - r / (size / 2)))
        draw.ellipse([size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r], outline=(30, 41, 59, alpha), width=3)
    return img

if __name__ == "__main__":
    assets_dir = r"C:\Users\USER\Downloads\chor-police-live\chor-police-live\app\assets"
    
    # 1. Main Icon (1024x1024)
    print("Generating main icon.png...")
    main_icon = create_radar_icon(1024)
    main_icon.save(os.path.join(assets_dir, "icon.png"), "PNG")
    
    # 2. Adaptive Foreground (1024x1024)
    print("Generating android-icon-foreground.png...")
    fg = create_adaptive_foreground(1024)
    fg.save(os.path.join(assets_dir, "android-icon-foreground.png"), "PNG")

    # 3. Adaptive Background (1024x1024)
    print("Generating android-icon-background.png...")
    bg = create_adaptive_background(1024)
    bg.save(os.path.join(assets_dir, "android-icon-background.png"), "PNG")

    # 4. Splash Icon (512x512)
    print("Generating splash-icon.png...")
    splash = main_icon.resize((512, 512), Image.Resampling.LANCZOS)
    splash.save(os.path.join(assets_dir, "splash-icon.png"), "PNG")

    # 5. Favicon (48x48)
    print("Generating favicon.png...")
    fav = main_icon.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save(os.path.join(assets_dir, "favicon.png"), "PNG")

    print("All assets successfully generated!")


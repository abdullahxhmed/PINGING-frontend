import os
from PIL import Image, ImageDraw
import qrcode
from qrcode.constants import ERROR_CORRECT_H

# Specifications
QR_URL = "https://kauntact.in"

# Configuration for Dark and Light Mini Stickers
CONFIGS = [
    {
        "name": "dark",
        "template": "src/assets/miniDark.PNG",
        "output": "output_mini_dark.png",
        # Box bounds: left=93, top=266, right=796, bottom=975 (w=704, h=710, radius=55)
        "box": (93, 266, 796, 975),
        "radius": 55,
        "box_color": (45, 45, 42),       # #2D2D2A
        "qr_fg": (245, 244, 238),         # #F5F4EE (Light QR)
    },
    {
        "name": "light",
        "template": "src/assets/miniWhite.PNG",
        "output": "output_mini_light.png",
        # Box bounds: left=80, top=243, right=805, bottom=988 (w=726, h=746, radius=55)
        "box": (80, 243, 805, 988),
        "radius": 55,
        "box_color": (245, 244, 238),     # #F5F4EE
        "qr_fg": (17, 17, 15),            # #11110F (Dark QR)
    }
]

def build_mini_sticker(cfg):
    template_path = cfg["template"]
    output_path = cfg["output"]
    box = cfg["box"]
    radius = cfg["radius"]
    box_color = cfg["box_color"]
    qr_fg = cfg["qr_fg"]

    print(f"Generating {cfg['name']} mini sticker...")
    base_img = Image.open(template_path).convert("RGBA")
    w, h = base_img.size

    # 1. Generate QR matrix with high error correction
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=10,
        border=0,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    matrix_size = len(matrix)

    # 2. Render QR onto a layer matching the box size
    bx0, by0, bx1, by1 = box
    box_w = bx1 - bx0 + 1
    box_h = by1 - by0 + 1

    # Create box canvas
    qr_box_img = Image.new("RGBA", (box_w, box_h), box_color + (255,))
    draw_box = ImageDraw.Draw(qr_box_img)

    # Draw QR modules
    mod_w = box_w / matrix_size
    mod_h = box_h / matrix_size
    for row in range(matrix_size):
        for col in range(matrix_size):
            if matrix[row][col]:
                x_start = round(col * mod_w)
                y_start = round(row * mod_h)
                x_end = round((col + 1) * mod_w)
                y_end = round((row + 1) * mod_h)
                draw_box.rectangle([x_start, y_start, x_end, y_end], fill=qr_fg + (255,))

    # 3. Create rounded corner mask
    mask = Image.new("L", (box_w, box_h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, box_w - 1, box_h - 1], radius=radius, fill=255)

    # 4. Composite QR onto the base image
    base_img.paste(qr_box_img, (bx0, by0), mask)

    # 5. Save output
    base_img.save(output_path, "PNG", optimize=True)
    print(f"Saved: {output_path} ({w}x{h})")

if __name__ == "__main__":
    for cfg in CONFIGS:
        build_mini_sticker(cfg)
    print("Done! Both mini stickers generated successfully.")

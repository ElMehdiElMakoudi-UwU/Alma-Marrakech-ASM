"""Build the site's images from the Alma Marrakech dossier PDF.

Usage:  python tools/extract_assets.py "path/to/dossier.pdf"
Needs:  pip install pymupdf numpy opencv-python-headless pillow

What it does:
- pulls the original images out of the PDF and converts them from CMYK to RGB
- warps each night render onto its daytime twin so crossfades do not ghost
- writes large and small WebP files to public/img
- renders the vector floor plans and elevations at high resolution

The image numbers (xrefs) are specific to the September 2026 PDF. If the
InDesign file is re-exported they will change: list them with page.get_images().
"""
import pathlib
import sys

import cv2
import numpy as np
import pymupdf
from PIL import Image

PDF = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "img"
OUT.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(PDF)


def load(xref):
    """Return an image from the PDF as a BGR array, converted to RGB space."""
    pix = pymupdf.Pixmap(doc, xref)
    if pix.n - pix.alpha != 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    if pix.alpha:
        pix = pymupdf.Pixmap(pix, 0)
    rgb = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)
    return rgb[:, :, ::-1].copy()


def fit(img, width):
    height = round(img.shape[0] * width / img.shape[1])
    mode = cv2.INTER_AREA if width < img.shape[1] else cv2.INTER_LANCZOS4
    return cv2.resize(img, (width, height), interpolation=mode)


def save(img, name, widths=(2000, 1000), quality=80):
    for width in widths:
        out = fit(img, width)
        pil = Image.fromarray(out[:, :, ::-1])
        path = OUT / f"{name}-{width}.webp"
        pil.save(path, "WEBP", quality=quality, method=6)
        print(f"{path.name:28} {out.shape[1]}x{out.shape[0]} {path.stat().st_size // 1024} KB")


def align_pair(day_xref, night_xref, name, width=2000, inset=0.008, similarity=False):
    """Warp the night image onto the day image and save both with one crop.

    Features are matched at 1600 px, close to the day image's native size, and
    the transform is then scaled up. similarity=True allows only scale, shift
    and rotation, for pairs with too few matches to trust a full homography.
    """
    day = fit(load(day_xref), width)
    night = fit(load(night_xref), width)
    work = 1600
    grey = lambda i: cv2.createCLAHE(4, (8, 8)).apply(cv2.cvtColor(fit(i, work), cv2.COLOR_BGR2GRAY))
    sift = cv2.SIFT_create(8000)
    kd, dd = sift.detectAndCompute(grey(day), None)
    kn, dn = sift.detectAndCompute(grey(night), None)
    ratio = 0.8 if similarity else 0.75
    good = [m for m, n in cv2.BFMatcher().knnMatch(dn, dd, k=2) if m.distance < ratio * n.distance]
    src = np.float32([kn[m.queryIdx].pt for m in good])
    dst = np.float32([kd[m.trainIdx].pt for m in good])
    if similarity:
        A, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4)
        H = np.vstack([A, [0, 0, 1]])
    else:
        H, inliers = cv2.findHomography(src, dst, cv2.RANSAC, 3)
    print(f"{name}: {int(inliers.sum())} inliers of {len(good)} matches, scale {np.hypot(H[0,0], H[1,0]):.4f}")
    k = width / work
    S = np.diag([k, k, 1.0])
    H = S @ H @ np.linalg.inv(S)
    warped = cv2.warpPerspective(night, H, (day.shape[1], day.shape[0]), flags=cv2.INTER_LANCZOS4)
    mx, my = round(day.shape[1] * inset), round(day.shape[0] * inset)
    save(day[my:-my, mx:-mx], f"{name}-jour")
    save(warped[my:-my, mx:-mx], f"{name}-nuit")


def render_clip(page_no, rect, name, dpi=220, quality=88, widths=(1800, 1000)):
    """Render part of a vector page. page_no is the printed (1-based) page."""
    pix = doc[page_no - 1].get_pixmap(dpi=dpi, clip=pymupdf.Rect(*rect), alpha=False)
    img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3][:, :, ::-1]
    save(img.copy(), name, widths=[min(w, img.shape[1]) for w in widths], quality=quality)


# Day and night pairs
align_pair(176, 179, "facade")
align_pair(314, 191, "portail")
align_pair(194, 198, "fontaines")
align_pair(126, 172, "masse", similarity=True)

# Single renders
for xref, name in [(182, "angle-a"), (185, "angle-b"), (201, "salon"), (204, "piscine"), (207, "chambre"), (210, "sejour")]:
    save(load(xref), name, widths=(1672, 1000))

# Situation maps, cropped to remove the pale text panel baked into the image
for xref, name in [(10, "carte-marrakech"), (19, "carte-site")]:
    img = load(xref)
    save(img[:, : round(img.shape[1] * 0.765)], name)

# Parcel diagrams
for xref, name in [(118, "diag-parcelles"), (119, "diag-types"), (120, "diag-acces")]:
    save(load(xref), name, widths=(1200, 700))

# Floor plans (vector pages). Page 11 repeats page 10, so it is left out.
PLAN = (60, 108, 1130, 768)
render_clip(8, PLAN, "plan-t1-rdc")
render_clip(9, PLAN, "plan-t1-etage")
render_clip(10, (150, 108, 1130, 768), "plan-t2-rdc")

# Elevations
render_clip(12, (30, 122, 480, 392), "elev-principale", widths=(1200, 700))
render_clip(12, (590, 122, 1165, 392), "elev-laterale", widths=(1200, 700))
render_clip(12, (350, 435, 860, 700), "elev-arriere", widths=(1200, 700))

# Link preview image: social networks expect a 1200x630 JPEG
with Image.open(OUT / "portail-jour-2000.webp") as hero:
    hero.convert("RGB").crop((0, 40, 2000, 1090)).resize((1200, 630), Image.LANCZOS).save(OUT / "og.jpg", quality=85)

total = sum(p.stat().st_size for p in OUT.iterdir())
print(f"TOTAL {total / 1e6:.1f} MB in {len(list(OUT.iterdir()))} files")

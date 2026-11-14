#!/usr/bin/env python3
"""Turn a downloaded image into a game-ready art file.

    python3 tools/fit_art.py downloads/                 every image in a folder
    python3 tools/fit_art.py cottage.png --slot mw_cottages_3
    python3 tools/fit_art.py downloads/ --out some/other/folder

For each image it:
  1. works out which art slot it is for (from the file name, or --slot)
  2. removes a plain flat background if the image has no real transparency
  3. trims the empty space around the object
  4. re-centres it with the 12% margin and anchor the game expects
  5. resizes it to the slot's export size
  6. saves it as WebP in assets/ under the slot's name

Then run `node tools/build.js` to put it in the game.

Needs Pillow (`pip install pillow`) and Node (to read src/config/slots.js).
"""

import argparse
import difflib
import json
import subprocess
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EXTS = {".png", ".webp", ".jpg", ".jpeg"}
ALPHA_MIN = 10  # pixels fainter than this count as empty when trimming


def load_slots():
    """Slot name -> definition, straight from the table the game reads."""
    js = (
        "import { slotFiles, MARGIN } from './src/config/slots.js';"
        "console.log(JSON.stringify({ margin: MARGIN, files: slotFiles() }));"
    )
    out = subprocess.run(
        ["node", "--input-type=module", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout
    data = json.loads(out)
    return data["margin"], data["files"]


def slot_name(path, slots):
    """'Nimbit Idle (2).png' -> 'nimbit_idle' when that is a slot."""
    stem = path.stem.lower().replace(" ", "_").replace("-", "_")
    if stem in slots:
        return stem
    # tolerate download suffixes such as "lantern_on_(1)" or "lantern_on_final"
    parts = stem.split("_")
    for n in range(len(parts) - 1, 0, -1):
        cand = "_".join(parts[:n])
        if cand in slots:
            return cand
    return None


def is_opaque(img):
    lo, _ = img.getchannel("A").getextrema()
    return lo >= 250


def remove_flat_background(img, tol=28):
    """Make a plain backdrop transparent by flooding in from the edges.

    Returns (image, None) on success or (None, reason) when the backdrop is
    not plain enough to remove safely (for example a painted checkerboard).
    """
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    spread = max(max(abs(c[i] - corners[0][i]) for c in corners) for i in range(3))
    if spread > tol:
        return None, "its background is not one plain colour (a painted checkerboard, perhaps)"
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def near(p):
        return abs(p[0] - bg[0]) <= tol and abs(p[1] - bg[1]) <= tol and abs(p[2] - bg[2]) <= tol

    seen = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        p = px[x, y]
        if not near(p):
            continue
        seen[y * w + x] = 1
        px[x, y] = (p[0], p[1], p[2], 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return img, None


def content_box(img):
    return img.getchannel("A").point(lambda a: 255 if a > ALPHA_MIN else 0).getbbox()


def fit(path, name, slots, margin, out_dir, quality):
    """Process one image. Returns (output path, list of notes)."""
    d = slots[name]
    notes = []
    img = Image.open(path).convert("RGBA")
    glow = name.endswith("_glow")
    inner = 1 - margin * 2

    # ---- full-screen and full-width images: resize only ----
    if d.get("fit"):
        W = d.get("px") or d["w"] * 4
        if d["fit"] == "cover":
            H = round(W * d["h"] / d["w"])
            s = max(W / img.width, H / img.height)
            big = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
            left, top = (big.width - W) // 2, (big.height - H) // 2
            res = big.crop((left, top, left + W, top + H)).convert("RGB")
        else:
            s = W / img.width
            res = img.resize((W, max(1, round(img.height * s))), Image.LANCZOS)
        if s > 1.5:
            notes.append(f"enlarged {s:.1f}x, so it may look soft")
        return save(res, out_dir, name, quality), notes

    # ---- everything else: an object on a transparent canvas ----
    W = d.get("px") or round(d["w"] * 4 / inner)
    H = round(W * d["h"] / d["w"])
    if glow:
        W, H = W * 2, H * 2

    if is_opaque(img):
        cleaned, why = remove_flat_background(img)
        if cleaned is None:
            raise ValueError(f"it has no transparency and {why}. Regenerate it on a plain flat background.")
        img = cleaned
        notes.append("had no transparency: removed its flat background (check the edges for a fringe)")

    if glow:
        # a halo fades to nothing, so trimming would clip it: scale the whole image in
        s = min(W / img.width, H / img.height)
        obj = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        x, y = (W - obj.width) // 2, (H - obj.height) // 2
    else:
        box = content_box(img)
        if not box:
            raise ValueError("it is completely transparent")
        if box[0] <= 0 or box[1] <= 0 or box[2] >= img.width or box[3] >= img.height:
            notes.append("the object touches the edge of the source image, so part of it may be cut off")
        obj = img.crop(box)
        bw, bh = W * inner, H * inner
        s = min(bw / obj.width, bh / obj.height)
        obj = obj.resize((max(1, round(obj.width * s)), max(1, round(obj.height * s))), Image.LANCZOS)
        x = (W - obj.width) // 2
        if d.get("anchor") == "ground":
            y = round(H * (1 - margin)) - obj.height  # stands on the ground line
        else:
            y = (H - obj.height) // 2
        shape, want = obj.width / obj.height, d["w"] / d["h"]
        if shape > want * 1.6 or shape < want / 1.6:
            notes.append(f"its shape ({shape:.2f} wide per tall) is far from the slot's ({want:.2f}), so it will look small")
    if s > 1.5:
        notes.append(f"enlarged {s:.1f}x, so it may look soft")

    res = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    res.alpha_composite(obj, (x, y))
    return save(res, out_dir, name, quality), notes


def save(img, out_dir, name, quality):
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{name}.webp"
    img.save(out, "WEBP", quality=quality, method=6)
    for other in out_dir.glob(f"{name}.*"):
        if other.suffix.lower() in EXTS and other != out:
            print(f"    note: {other.name} also fills this slot; delete one of them")
    return out


def main():
    ap = argparse.ArgumentParser(description="Fit downloaded images into Wonderlost art slots.")
    ap.add_argument("input", type=Path, help="an image, or a folder of images")
    ap.add_argument("--slot", help="slot name, when the file is not named after its slot (single file only)")
    ap.add_argument("--out", type=Path, default=ROOT / "assets", help="where to save (default: assets/)")
    ap.add_argument("--quality", type=int, default=90, help="WebP quality, 1-100 (default 90)")
    args = ap.parse_args()

    margin, slots = load_slots()
    if args.input.is_dir():
        if args.slot:
            sys.exit("--slot only works with a single file")
        files = sorted(p for p in args.input.iterdir() if p.suffix.lower() in EXTS)
    else:
        files = [args.input]
    if not files:
        sys.exit(f"no images found in {args.input}")

    done = failed = 0
    for path in files:
        name = args.slot or slot_name(path, slots)
        if name not in slots:
            near = difflib.get_close_matches(args.slot or path.stem.lower(), list(slots), n=3, cutoff=0.5)
            hint = f" Did you mean: {', '.join(near)}?" if near else ""
            print(f"SKIPPED  {path.name}: no slot is called that.{hint}")
            failed += 1
            continue
        try:
            out, notes = fit(path, name, slots, margin, args.out, args.quality)
        except (ValueError, OSError) as err:
            print(f"FAILED   {path.name}: {err}")
            failed += 1
            continue
        with Image.open(out) as im:
            size = f"{im.width} x {im.height}"
        print(f"OK       {path.name} -> {out.name}  ({size}, {out.stat().st_size / 1024:.0f} KB)")
        for n in notes:
            print(f"    note: {n}")
        done += 1

    print(f"\n{done} saved to {args.out}, {failed} not saved.")
    if done:
        print("Next: node tools/build.js")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

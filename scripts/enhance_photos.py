"""Conservative, deterministic enhancement. Run with Pillow installed.
Original files remain untouched; the audit is the authoritative input list.
No resizing, generated detail, recoloring, or content replacement.
"""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'research/image-quality-audit.json').read_text())
outdir = ROOT / 'assets/enhanced'
outdir.mkdir(parents=True, exist_ok=True)
report = []
for row in rows:
    source = ROOT / row['file']
    image = Image.open(source).convert('RGB')
    y, cb, cr = image.convert('YCbCr').split()
    # A small denoise contribution only where the local difference is <= 3/255.
    # Strong edges and all chroma are preserved.
    median = y.filter(ImageFilter.MedianFilter(3))
    diff = ImageChops.difference(y, median)
    mask = diff.point(lambda v: 32 if v <= 3 else 0)
    clean = Image.composite(median, y, mask)
    portrait = source.name == 'exile-perfume-2026.jpg'
    sharp = clean.filter(ImageFilter.UnsharpMask(
        radius=.85 if portrait else 1.05,
        percent=65 if portrait else 100,
        threshold=3))
    enhanced = Image.merge('YCbCr', (sharp, cb, cr)).convert('RGB')
    output = outdir / (source.stem + '.webp')
    # Lossless encoding avoids a second round of lossy compression.
    enhanced.save(output, 'WEBP', lossless=True, method=6)
    report.append({
        'original': row['file'], 'enhanced': output.relative_to(ROOT).as_posix(),
        'size': list(image.size), 'originalBytes': source.stat().st_size,
        'enhancedBytes': output.stat().st_size,
        'operation': 'mild luminance denoise + unsharp mask; lossless WebP; no resize',
    })
(ROOT / 'research/image-enhancement.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(f'Processed {len(report)} images; originals preserved; {sum(r["enhancedBytes"] for r in report):,} bytes total.')

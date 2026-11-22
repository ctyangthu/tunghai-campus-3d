"""Samples each building's roof colour from the NLSC 2024 orthophoto.

    python3 scripts/build-roof-colors.py

Reads docs/data/campus-geo.json and data/campus-extras.json, downloads the PHOTO2
tiles it needs into .cache/aerial/, and writes data/roof-colors.json, mapping each
OpenStreetMap id to the median colour of the roof pixels inside its footprint
(a small inset keeps out walls; foliage and deep shadow are ignored where enough
roof remains). Needs Python 3 and Pillow.

Imagery: 國土測繪中心 (NLSC) 正射影像, published under the 政府資料開放授權條款.
"""
import io
import json
import math
import os
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'aerial'
ZOOM = 19
TILES = 'https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}'
ORIGIN = (120.605, 24.179)  # as scripts/config.mjs
# Vector projection of docs/data/campus-geo.json (scripts/lib/projection.mjs).
PER_LON = 111320 * math.cos(math.radians(ORIGIN[1]))
PER_LAT = 110770
INSET_METRES = .7


def to_pixel(x, z):
    lon = ORIGIN[0] + x / PER_LON
    lat = ORIGIN[1] - z / PER_LAT
    size = 256 * 2 ** ZOOM
    phi = math.radians(lat)
    return ((lon + 180) / 360 * size,
            (1 - math.log(math.tan(phi) + 1 / math.cos(phi)) / math.pi) / 2 * size)


tiles = {}


def tile(tx, ty):
    key = (tx, ty)
    if key not in tiles:
        path = CACHE / f'{ZOOM}-{tx}-{ty}.jpg'
        if not path.exists():
            request = urllib.request.Request(TILES.format(z=ZOOM, x=tx, y=ty),
                                             headers={'User-Agent': 'tunghai-campus-3d data script'})
            for attempt in range(4):
                try:
                    path.write_bytes(urllib.request.urlopen(request, timeout=60).read())
                    break
                except OSError:
                    time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f'Could not download tile {key}')
            time.sleep(.05)
        tiles[key] = Image.open(io.BytesIO(path.read_bytes())).convert('RGB').load()
    return tiles[key]


def inside(px, py, ring):
    hit = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def edge_distance(px, py, ring):
    best = math.inf
    for i in range(len(ring)):
        (ax, ay), (bx, by) = ring[i], ring[(i + 1) % len(ring)]
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(px - ax - t * dx, py - ay - t * dy))
    return best


def roof_colour(points):
    ring = [to_pixel(x, z) for x, z in points]
    metres_per_pixel = 1 / (to_pixel(1, 0)[0] - to_pixel(0, 0)[0])
    inset = INSET_METRES / metres_per_pixel
    xs, ys = [p[0] for p in ring], [p[1] for p in ring]
    samples = []
    for py in range(int(min(ys)), int(max(ys)) + 1):
        for px in range(int(min(xs)), int(max(xs)) + 1):
            cx, cy = px + .5, py + .5
            if not inside(cx, cy, ring):
                continue
            if edge_distance(cx, cy, ring) < inset:
                continue
            samples.append(tile(px // 256, py // 256)[px % 256, py % 256])
    if not samples:  # very small footprint: use everything inside it
        for py in range(int(min(ys)), int(max(ys)) + 1):
            for px in range(int(min(xs)), int(max(xs)) + 1):
                if inside(px + .5, py + .5, ring):
                    samples.append(tile(px // 256, py // 256)[px % 256, py % 256])
    if not samples:
        return None

    def foliage(r, g, b):
        return g > r + 8 and g > b + 4 and g - min(r, b) > 14

    def shadow(r, g, b):
        return max(r, g, b) < 45

    roof = [s for s in samples if not foliage(*s) and not shadow(*s)]
    if len(roof) < .3 * len(samples):
        roof = [s for s in samples if not shadow(*s)] or samples
    channels = [sorted(s[k] for s in roof) for k in range(3)]
    median = [c[len(c) // 2] for c in channels]
    return '#' + ''.join(f'{v:02x}' for v in median)


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    geo = json.loads((ROOT / 'docs/data/campus-geo.json').read_text())
    extras = json.loads((ROOT / 'data/campus-extras.json').read_text())
    colours = {}
    for building in geo['buildings'] + extras['buildings']:
        colour = roof_colour(building['points'])
        if colour:
            colours[building['osm']] = colour
    out = ROOT / 'data/roof-colors.json'
    out.write_text(json.dumps(dict(sorted(colours.items())), indent=0, separators=(',', ':')) + '\n')
    print(f'data/roof-colors.json: {len(colours)} buildings from {len(tiles)} tiles')


if __name__ == '__main__':
    main()

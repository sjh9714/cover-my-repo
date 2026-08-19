#!/usr/bin/env python3
"""Deterministic checks for a repo-cover card. Stdlib only.

Usage: python3 scripts/check_card.py <card.html> [more.html ...]
Exit 0 = all cards pass, 1 = any FAIL.
"""
import re
import sys
import unicodedata

TIERS = [(9, 132), (14, 108), (20, 92), (26, 74), (10**9, 64)]


def strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html)


def is_cjk(text: str) -> bool:
    return any("CJK" in unicodedata.name(c, "") or
               "HANGUL" in unicodedata.name(c, "") for c in text)


def luminance(hexcolor: str) -> float:
    rgb = [int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
    return .2126 * lin[0] + .7152 * lin[1] + .0722 * lin[2]


def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + .05) / (lb + .05)


def check(path: str) -> bool:
    src = open(path, encoding="utf-8").read()
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"  FAIL  {msg}")

    def warn(msg):
        print(f"  WARN  {msg}")

    # canvas: card 1280x640 or banner 1280x320
    if "1280px" not in src or ("640px" not in src and "320px" not in src):
        fail("canvas is not 1280x640 or 1280x320")

    # self-contained: only Google Fonts may be external
    for url in re.findall(r"https?://[^\s\"'()]+", src):
        host = url.split("/")[2]
        if host not in ("fonts.googleapis.com", "fonts.gstatic.com"):
            fail(f"external resource not allowed: {host}")

    # forbidden styling
    for pat, name in [(r"box-shadow", "box-shadow"),
                      (r"drop-shadow", "drop-shadow"),
                      (r"backdrop-filter", "backdrop-filter"),
                      (r"[\U0001F300-\U0001FAFF]", "emoji")]:
        if re.search(pat, src):
            fail(f"forbidden: {name}")
    grads = len(re.findall(r"linear-gradient", src))
    if grads and "background-size:32px32px" not in src.replace(" ", ""):
        fail("gradient outside the blueprint grid")

    # title tier
    m = re.search(r'class="title"[^>]*>(.*?)</h1>', src, re.S)
    title = strip_tags(m.group(1)).strip().rstrip("._") if m else ""
    fs = re.search(r"\.title\{[^}]*?font-size:(\d+)px", src, re.S)
    if title and fs:
        size = int(fs.group(1))
        tier = next(px for n, px in TIERS if len(title) <= n)
        if size > tier:
            fail(f"title '{title}' ({len(title)} chars) at {size}px exceeds tier {tier}px")
    elif not title:
        fail("no <h1 class=\"title\"> found")

    # description budget
    m = re.search(r'class="desc"[^>]*>(.*?)</p>', src, re.S)
    if m:
        desc = strip_tags(m.group(1)).strip()
        budget = 60 if is_cjk(desc) else 110
        if len(desc) > budget:
            fail(f"description {len(desc)} chars > budget {budget}")
        if is_cjk(desc):
            if "Noto" not in src:
                fail("CJK text without a Noto font in the stack")
            if any("HANGUL" in unicodedata.name(c, "") for c in desc) \
                    and "keep-all" not in src:
                fail("Korean text without word-break:keep-all")
    else:
        warn("no <p class=\"desc\"> found")

    # accent contrast vs card background
    bg = re.search(r"\.card\{[^}]*?background:(#[0-9A-Fa-f]{6})", src, re.S)
    accent = re.search(r"\.(?:stop|rule)\{[^}]*?(?:color|background):(#[0-9A-Fa-f]{6})", src, re.S)
    if bg and accent:
        ratio = contrast(bg.group(1), accent.group(1))
        if ratio < 3.0:
            fail(f"accent contrast {ratio:.2f}:1 < 3.0:1 on {bg.group(1)}")
        elif ratio < 4.5:
            warn(f"accent contrast {ratio:.2f}:1 — aim for 4.5:1")

    # downscale legibility
    for msize in re.findall(r"\.meta\{[^}]*?font:[^;]*?\b(\d+)px", src, re.S):
        if int(msize) < 14:
            warn(f"meta text {msize}px — illegible at X's 506px card width")

    print(f"{'PASS' if ok else 'FAIL'}  {path}")
    return ok


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if all(results) else 1)

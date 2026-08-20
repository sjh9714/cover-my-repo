#!/usr/bin/env python3
"""Build the shipped example cards. Each mood is a self-contained HTML template.

The SKILL contract: an agent writes cards like these by hand following
references/mood-*.md. This script only regenerates the checked-in examples.
"""
import base64
import hashlib
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "skills" / "repo-cover" / "assets" / "examples"
OUT.mkdir(parents=True, exist_ok=True)

FONTS = ("https://fonts.googleapis.com/css2?"
         "family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&"
         "family=IBM+Plex+Mono:wght@400;500;600&"
         "family=Noto+Sans+KR:wght@400;500&"
         "family=Noto+Sans+JP:wght@400;500&"
         "family=Noto+Sans+SC:wght@400;500&display=swap")

PAPER, INK, MUTED, HAIR = "#FAF9F5", "#1D1A16", "#6B655C", "#E3DFD7"


def seed(name: str) -> int:
    return int(hashlib.sha256(name.encode()).hexdigest()[:8], 16)


def blend(hex1: str, hex2: str, t: float) -> str:
    a = [int(hex1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(hex2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(a, b))


def nowrap_hyphens(text: str) -> str:
    """Keep compound words like 'self-contained' on one line."""
    return re.sub(r"(\w+(?:-\w+)+)",
                  r'<span style="white-space:nowrap">\1</span>', text)


def title_size(name: str) -> int:
    n = len(name)
    if n <= 9:
        return 132
    if n <= 14:
        return 108
    if n <= 20:
        return 92
    if n <= 26:
        return 74
    return 64


def avatar_data_uri(login: str) -> str:
    url = f"https://github.com/{login}.png?size=144"
    with urllib.request.urlopen(url, timeout=15) as r:
        return "data:image/png;base64," + base64.b64encode(r.read()).decode()


def head(extra_css: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="{FONTS}">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1280px;height:640px;overflow:hidden}}
{extra_css}
</style></head><body>"""


def meta_items(items, dot_color):
    html = ""
    for i, m in enumerate(items):
        dot = (f'<span style="display:inline-block;width:10px;height:10px;'
               f'border-radius:50%;background:{dot_color};margin-right:10px;'
               f'vertical-align:-1px"></span>') if i == 0 else ""
        html += f'<span class="item">{dot}{m}</span>'
    return html


# ---------------------------------------------------------------- editorial
def editorial(owner, name, desc, accent, metas, avatar=None, cjk=False, lang=None):
    s = seed(name)
    n_arcs = 4 + s % 3                      # 4-6 arcs, seeded by repo name
    radii = [84 + i * (56 + s % 14) for i in range(n_arcs)]
    ops = [.5, .36, .26, .17, .11, .07]
    arcs = "".join(
        f'<circle cx="420" cy="420" r="{r}" opacity="{o}"/>'
        for r, o in zip(radii, ops))
    if lang == "ja":
        desc_css = "font:400 30px/1.6 'Noto Sans JP',sans-serif"
    elif lang == "sc":
        desc_css = "font:400 30px/1.6 'Noto Sans SC',sans-serif"
    elif cjk or lang == "ko":
        desc_css = "font:400 30px/1.6 'Noto Sans KR',sans-serif;word-break:keep-all"
    else:
        desc_css = "font:400 29px/1.5 'Noto Sans KR',sans-serif"
    av = (f'<img class="avatar" src="{avatar}" width="72" height="72">'
          if avatar else "")
    css = f"""
.card{{position:relative;width:1280px;height:640px;background:{PAPER};padding:118px 88px 0}}
.eyebrow{{font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;
  text-transform:uppercase;color:{MUTED};display:flex;align-items:center;gap:12px}}
.eyebrow .dot{{width:9px;height:9px;border-radius:50%;background:{accent}}}
.title{{font-family:'Fraunces',serif;font-weight:560;color:{INK};font-size:{title_size(name)}px;
  letter-spacing:-.015em;line-height:1.04;margin-top:38px;font-variation-settings:'opsz' 144}}
.title .stop{{color:{accent}}}
.desc{{{desc_css};color:{MUTED};margin-top:34px;max-width:660px}}
.meta{{position:absolute;left:0;right:0;bottom:0;background:{PAPER};
  margin:0 88px;padding:22px 0 64px;border-top:1px solid {HAIR};
  display:flex;gap:44px;font:500 15px/1 'IBM Plex Mono',monospace;
  letter-spacing:.14em;text-transform:uppercase;color:{MUTED}}}
.arcs{{position:absolute;right:0;bottom:0}}
.avatar{{position:absolute;top:104px;right:88px;border-radius:50%;
  outline:1px solid {HAIR};outline-offset:5px}}
"""
    return head(css) + f"""<div class="card">
<svg class="arcs" width="420" height="420" viewBox="0 0 420 420" fill="none">
<g stroke="{accent}" stroke-width="2">{arcs}</g></svg>
{av}
<div class="eyebrow"><span class="dot"></span>{owner}</div>
<h1 class="title">{name}<span class="stop">.</span></h1>
<p class="desc">{nowrap_hyphens(desc)}</p>
<div class="meta">{meta_items(metas, accent)}</div>
</div></body></html>"""


# ------------------------------------------------------------ banner (1280x320)
def banner(owner, name, desc, accent, metas):
    s = seed(name)
    n_arcs = 3 + s % 2
    radii = [64 + i * (48 + s % 12) for i in range(n_arcs)]
    arcs = "".join(
        f'<circle cx="300" cy="300" r="{r}" opacity="{o}"/>'
        for r, o in zip(radii, [.5, .3, .18, .1]))
    css = f"""
.card{{position:relative;width:1280px;height:320px;background:{PAPER};
  padding:64px 72px 0;overflow:hidden}}
.eyebrow{{font:500 13px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;
  text-transform:uppercase;color:{MUTED};display:flex;align-items:center;gap:10px}}
.eyebrow .dot{{width:8px;height:8px;border-radius:50%;background:{accent}}}
.title{{font-family:'Fraunces',serif;font-weight:560;color:{INK};font-size:72px;
  letter-spacing:-.015em;line-height:1.02;margin-top:22px;font-variation-settings:'opsz' 144}}
.title .stop{{color:{accent}}}
.desc{{font:400 22px/1.4 'Noto Sans KR',sans-serif;color:{MUTED};
  margin-top:16px;max-width:760px}}
.arcs{{position:absolute;right:0;bottom:0}}
"""
    return head(css).replace("height:640px", "height:320px") + f"""<div class="card">
<svg class="arcs" width="300" height="300" viewBox="0 0 300 300" fill="none">
<g stroke="{accent}" stroke-width="2">{arcs}</g></svg>
<div class="eyebrow"><span class="dot"></span>{owner}</div>
<h1 class="title">{name}<span class="stop">.</span></h1>
<p class="desc">{nowrap_hyphens(desc)}</p>
</div></body></html>"""


# ------------------------------------------------------------------- poster
def poster(owner, name, desc, accent, metas):
    deep = blend(accent, "#14110D", 0.72)
    lift = blend(accent, "#FFFFFF", 0.55)
    cream = "#FAF6EE"
    glyph = name[0].upper()
    css = f"""
.card{{position:relative;width:1280px;height:640px;background:{deep};
  padding:118px 88px 0;overflow:hidden}}
.glyph{{position:absolute;right:-48px;bottom:-190px;font-family:'Fraunces',serif;
  font-weight:600;font-size:660px;line-height:1;color:{cream};opacity:.07;
  font-variation-settings:'opsz' 144}}
.eyebrow{{font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;
  text-transform:uppercase;color:{cream};opacity:.72}}
.title{{font-family:'Fraunces',serif;font-weight:560;color:{cream};
  font-size:{title_size(name)}px;letter-spacing:-.015em;line-height:1.04;
  margin-top:38px;font-variation-settings:'opsz' 144}}
.title .stop{{color:{lift}}}
.desc{{font:400 29px/1.5 'Noto Sans KR',sans-serif;color:{cream};opacity:.78;
  margin-top:34px;max-width:640px}}
.meta{{position:absolute;left:88px;right:88px;bottom:64px;
  border-top:1px solid rgba(250,246,238,.22);padding-top:22px;display:flex;gap:44px;
  font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;
  text-transform:uppercase;color:{cream};opacity:.85}}
"""
    return head(css) + f"""<div class="card">
<div class="glyph">{glyph}</div>
<div class="eyebrow">{owner}</div>
<h1 class="title">{name}<span class="stop">.</span></h1>
<p class="desc">{nowrap_hyphens(desc)}</p>
<div class="meta">{meta_items(metas, lift)}</div>
</div></body></html>"""


# ---------------------------------------------------------------- blueprint
def blueprint(owner, name, desc, accent, metas):
    bg, line = "#10233B", "rgba(214,228,244,.30)"
    text, dim = "#E8F0FA", "rgba(232,240,250,.62)"
    plate = f"{seed(name) % 900 + 100:03d}"
    tick = (f'<path d="M0 24V0h24" stroke="{line}" stroke-width="2" fill="none"/>')
    css = f"""
.card{{position:relative;width:1280px;height:640px;background:{bg};padding:128px 96px 0;
  background-image:linear-gradient(rgba(214,228,244,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(214,228,244,.055) 1px,transparent 1px);
  background-size:32px 32px;font-family:'IBM Plex Mono',monospace}}
.frame{{position:absolute;inset:40px;border:1px solid {line};pointer-events:none}}
.corner{{position:absolute;width:24px;height:24px}}
.eyebrow{{font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;
  text-transform:uppercase;color:{dim};display:flex;justify-content:space-between}}
.title{{font-weight:600;color:{text};font-size:{min(title_size(name), 88)}px;
  letter-spacing:.01em;line-height:1.1;margin-top:40px;text-transform:uppercase}}
.title .stop{{color:{accent}}}
.desc{{font:400 22px/1.7 'IBM Plex Mono',monospace;color:{dim};
  margin-top:32px;max-width:700px}}
.meta{{position:absolute;left:96px;right:96px;bottom:68px;
  border-top:1px solid {line};padding-top:22px;display:flex;gap:44px;
  font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;
  text-transform:uppercase;color:{dim}}}
.dims{{position:absolute;right:52px;bottom:46px;font:400 12px/1 'IBM Plex Mono',monospace;
  letter-spacing:.12em;color:{dim}}}
"""
    return head(css) + f"""<div class="card">
<div class="frame"></div>
<svg class="corner" style="left:28px;top:28px">{tick}</svg>
<svg class="corner" style="right:28px;top:28px;transform:rotate(90deg)">{tick}</svg>
<svg class="corner" style="right:28px;bottom:28px;transform:rotate(180deg)">{tick}</svg>
<svg class="corner" style="left:28px;bottom:28px;transform:rotate(270deg)">{tick}</svg>
<div class="eyebrow"><span>{owner}</span><span>PLATE {plate}</span></div>
<h1 class="title">{name}<span class="stop">_</span></h1>
<p class="desc">{nowrap_hyphens(desc)}</p>
<div class="meta">{meta_items(metas, accent)}</div>
<div class="dims">1280 &times; 640</div>
</div></body></html>"""


# ---------------------------------------------------------------- terminal
def terminal(owner, name, desc, accent, metas):
    bg, frame, bar = "#16181D", "#23262D", "#1D2026"
    text, dim = "#E6E3DC", "#8B8F98"
    meta_line = " · ".join(metas) if metas else ""
    css = f"""
.card{{position:relative;width:1280px;height:640px;background:{bg};
  padding:72px 96px;font-family:'IBM Plex Mono',monospace}}
.win{{position:absolute;inset:72px 96px;background:{bar};border:1px solid {frame};
  border-radius:10px;overflow:hidden}}
.bar{{height:44px;background:{frame};display:flex;align-items:center;padding:0 18px;gap:8px}}
.dot{{width:12px;height:12px;border-radius:50%;background:#3A3E46}}
.bar .wtitle{{margin:0 auto;font:400 13px/1 'IBM Plex Mono',monospace;color:{dim};
  letter-spacing:.08em}}
.body{{padding:44px 48px 0}}
.prompt{{font:400 18px/1 'IBM Plex Mono',monospace;color:{dim}}}
.prompt .sym{{color:{accent}}}
.title{{font-weight:600;color:{text};font-size:{min(title_size(name), 92)}px;
  letter-spacing:-.01em;line-height:1.06;margin-top:26px}}
.title .cursor{{display:inline-block;width:.5em;height:.9em;background:{accent};
  vertical-align:-.08em;margin-left:10px}}
.desc{{font:400 21px/1.7 'IBM Plex Mono',monospace;color:{dim};
  margin-top:26px;max-width:880px}}
.status{{position:absolute;left:48px;right:48px;bottom:32px;border-top:1px solid {frame};
  padding-top:18px;display:flex;justify-content:space-between;
  font:400 14px/1 'IBM Plex Mono',monospace;color:{dim};letter-spacing:.1em}}
"""
    return head(css) + f"""<div class="card"><div class="win">
<div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
<span class="wtitle">{owner}/{name} &mdash; zsh</span></div>
<div class="body">
<div class="prompt"><span class="sym">&#10095;</span> gh repo view {owner}/{name}</div>
<h1 class="title">{name}<span class="cursor"></span></h1>
<p class="desc">{nowrap_hyphens(desc)}</p>
</div>
<div class="status"><span>{meta_line.upper()}</span><span>EXIT 0</span></div>
</div></div></body></html>"""


# ------------------------------------------------------------------ gallery
def gallery(owner, name, desc, accent, metas):
    css = f"""
.card{{position:relative;width:1280px;height:640px;background:#FFFFFF;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding-top:126px}}
.eyebrow{{font:500 14px/1 'IBM Plex Mono',monospace;letter-spacing:.3em;
  text-transform:uppercase;color:{MUTED}}}
.title{{font-family:'Fraunces',serif;font-weight:420;color:{INK};
  font-size:{title_size(name)}px;letter-spacing:-.01em;line-height:1.04;
  margin-top:44px;font-variation-settings:'opsz' 144}}
.rule{{width:56px;height:2px;background:{accent};margin-top:40px}}
.desc{{font:400 27px/1.55 'Noto Sans KR',sans-serif;color:{MUTED};
  margin-top:36px;max-width:760px}}
.meta{{position:absolute;left:0;right:0;bottom:64px;display:flex;gap:44px;
  justify-content:center;font:500 14px/1 'IBM Plex Mono',monospace;
  letter-spacing:.18em;text-transform:uppercase;color:{MUTED}}}
"""
    return head(css) + f"""<div class="card">
<div class="eyebrow">{owner}</div>
<h1 class="title">{name}</h1>
<div class="rule"></div>
<p class="desc">{nowrap_hyphens(desc)}</p>
<div class="meta">{meta_items(metas, accent)}</div>
</div></body></html>"""


CARDS = [
    ("editorial-deepseek-harness", editorial, dict(
        owner="deepseek-ai", name="deepseek-harness",
        desc="Everything is a plugin. The model adapter, the tool registry, the sandbox, the agent loop itself.",
        accent="#3074BF", metas=["TypeScript", "MIT"], avatar="@deepseek-ai")),
    ("editorial-red-handed", editorial, dict(
        owner="sjh9714", name="red-handed",
        desc="Catch your agent red-handed. Verifies &ldquo;tests passed&rdquo; claims against what actually ran.",
        accent="#B3382C", metas=["TypeScript", "MIT"])),
    ("editorial-korean", editorial, dict(
        owner="toss", name="frontend-fundamentals",
        desc="변경하기 쉬운 프론트엔드 코드를 위한 지침서. 기준이 되는 좋은 코드의 원칙을 다룹니다.",
        accent="#2E71D2", metas=["Documentation", "MIT"], cjk=True)),
    ("editorial-repo-cover", editorial, dict(
        owner="sjh9714", name="cover-my-repo",
        desc="Three social preview options, checked and rendered by your coding agent. Five moods, CJK-first, local Chrome.",
        accent="#B3382C", metas=["Local Chrome", "MIT"])),
    ("editorial-japanese", editorial, dict(
        owner="zenn-dev", name="zenn-editor",
        desc="Zenn の記事とブックを執筆するためのエディタとプレビュー環境。",
        accent="#3074BF", metas=["TypeScript", "MIT"], lang="ja")),
    ("editorial-chinese", editorial, dict(
        owner="ruanyf", name="weekly",
        desc="科技爱好者周刊，每周五发布。记录每周值得分享的科技内容。",
        accent="#46627F", metas=["Documentation"], lang="sc")),
    ("banner-repo-cover", banner, dict(
        owner="sjh9714", name="cover-my-repo",
        desc="Three options. Five moods. One command.",
        accent="#B3382C", metas=[])),
    ("poster-archify", poster, dict(
        owner="tt-a1i", name="archify",
        desc="Beautiful, verifiable architecture diagrams. Self-contained HTML with motion and crisp export.",
        accent="#B08A2E", metas=["JavaScript", "MIT"])),
    ("poster-openlogi", poster, dict(
        owner="AprilNEA", name="OpenLogi",
        desc="A native, local-first manager for Logitech devices. No account. No telemetry. No Electron.",
        accent="#A2643C", metas=["Rust", "GPL-3.0"])),
    ("blueprint-macos-harness", blueprint, dict(
        owner="browser-use", name="macos-harness",
        desc="Drive real macOS apps from an agent loop. Accessibility-tree actions, screenshot diffing, replayable sessions.",
        accent="#5CC8FF", metas=["Python", "MIT"])),
    ("terminal-freeze", terminal, dict(
        owner="charmbracelet", name="freeze",
        desc="Generate images of code and terminal output. Crisp SVG and PNG straight from your shell.",
        accent="#C084FC", metas=["Go", "MIT"])),
    ("gallery-cumora", gallery, dict(
        owner="yetone", name="cumora",
        desc="Team chat where AI agents are first-class teammates, with private memory and real work to claim.",
        accent="#7266DA", metas=["TypeScript", "AGPL-3.0"])),
]

def cached_avatar(fname: str, login: str) -> str:
    """Reuse the data URI already checked in, so builds are deterministic."""
    existing = OUT / f"{fname}.html"
    if existing.exists():
        m = re.search(r'src="(data:image/png;base64,[^"]+)"', existing.read_text())
        if m:
            return m.group(1)
    return avatar_data_uri(login)


if __name__ == "__main__":
    for fname, fn, kw in CARDS:
        if kw.get("avatar", "").startswith("@"):
            kw["avatar"] = cached_avatar(fname, kw["avatar"][1:])
        (OUT / f"{fname}.html").write_text(fn(**kw))
        print("built", fname)

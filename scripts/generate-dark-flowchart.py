#!/usr/bin/env python3
"""Generate dark minimal vertical flowchart SVG (no Mermaid — avoids CJK clipping)."""

from __future__ import annotations

import sys
from pathlib import Path

W = 300
BOX_H = 52
GAP = 44
ARROW = 28
PAD_X = 20
FONT = "PingFang SC, Microsoft YaHei, ui-sans-serif, system-ui, sans-serif"
FILL_BOX = "#404040"
STROKE_BOX = "#707070"
FILL_BG = "#2d2d2d"
FILL_TEXT = "#f5f5f5"
FILL_LINE = "#9ca3af"


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def text_block(x: int, y: int, lines: list[str], font_size: int = 14) -> str:
    if len(lines) == 1:
        return (
            f'<text x="{x}" y="{y}" text-anchor="middle" fill="{FILL_TEXT}" '
            f'font-size="{font_size}" font-family="{FONT}">{esc(lines[0])}</text>'
        )
    parts = []
    start_y = y - (len(lines) - 1) * 9
    for i, line in enumerate(lines):
        parts.append(
            f'<text x="{x}" y="{start_y + i * 18}" text-anchor="middle" fill="{FILL_TEXT}" '
            f'font-size="{font_size}" font-family="{FONT}">{esc(line)}</text>'
        )
    return "\n    ".join(parts)


def rect_box(x: int, y: int, w: int, h: int) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" ry="4" '
        f'fill="{FILL_BOX}" stroke="{STROKE_BOX}" stroke-width="1"/>'
    )


def diamond(cx: int, cy: int, w: int, h: int) -> str:
    hw, hh = w // 2, h // 2
    pts = f"{cx},{cy - hh} {cx + hw},{cy} {cx},{cy + hh} {cx - hw},{cy}"
    return (
        f'<polygon points="{pts}" fill="{FILL_BOX}" stroke="{STROKE_BOX}" stroke-width="1"/>'
    )


def arrow_down(x: int, y1: int, y2: int) -> str:
    return (
        f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2 - 6}" stroke="{FILL_LINE}" stroke-width="1"/>'
        f'<polygon points="{x},{y2} {x - 5},{y2 - 7} {x + 5},{y2 - 7}" fill="{FILL_LINE}"/>'
    )


def label_on_line(x: int, y: int, text: str) -> str:
    tw = max(36, len(text) * 9 + 16)
    return (
        f'<rect x="{x - tw // 2}" y="{y - 10}" width="{tw}" height="18" rx="3" fill="#353535" stroke="#555"/>'
        f'<text x="{x}" y="{y + 4}" text-anchor="middle" fill="{FILL_TEXT}" font-size="11" '
        f'font-family="{FONT}">{esc(text)}</text>'
    )


def render_linear(steps: list[list[str]], out: Path) -> None:
    n = len(steps)
    height = PAD_X * 2 + n * BOX_H + (n - 1) * (GAP + ARROW)
    cx = W // 2
    els: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" '
        f'viewBox="0 0 {W} {height}">',
        f'<rect width="100%" height="100%" fill="{FILL_BG}"/>',
    ]
    y = PAD_X
    box_w = W - 40
    bx = (W - box_w) // 2
    for i, lines in enumerate(steps):
        els.append(rect_box(bx, y, box_w, BOX_H))
        els.append(text_block(cx, y + BOX_H // 2 + 5, lines))
        if i < n - 1:
            ay1 = y + BOX_H
            ay2 = ay1 + ARROW
            els.append(arrow_down(cx, ay1, ay2))
            y += BOX_H + GAP + ARROW
        else:
            y += BOX_H
    els.append("</svg>")
    out.write_text("\n  ".join(els) + "\n", encoding="utf-8")


def render_dev_workflow(out: Path) -> None:
    steps_before = [
        ["你说模糊需求"],
        [".cursor/rules", "引导澄清 + 边界条件"],
        ["AI 写 milestone", "文档"],
        ["AI 写代码", "+ 本地自测"],
    ]
    decision_lines = ["AI 给出 confirm 摘要", "分支名 / commit / diff", "你确认?"]
    steps_after = [
        ["AI 创建 feat 分支", "commit + push"],
        ["GitHub Actions CI", "lint + typecheck + build"],
        ["gh pr create draft", "指派 owner 为 reviewer"],
        ["你自查后", "mark ready"],
        ["@DavidZhan23", "手动 merge"],
        ["owner CD", "（不在你掌控）"],
    ]

    n_before = len(steps_before)
    n_after = len(steps_after)
    dec_h = 72
    total = (
        PAD_X * 2
        + n_before * BOX_H
        + (n_before - 1) * (GAP + ARROW)
        + GAP + ARROW
        + dec_h
        + GAP + ARROW
        + n_after * BOX_H
        + (n_after - 1) * (GAP + ARROW)
    )
    cx = W // 2
    box_w = W - 40
    bx = (W - box_w) // 2
    els: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{total}" '
        f'viewBox="0 0 {W} {total}">',
        f'<rect width="100%" height="100%" fill="{FILL_BG}"/>',
    ]
    y = PAD_X

    def add_box(lines: list[str], h: int = BOX_H) -> int:
        nonlocal y
        els.append(rect_box(bx, y, box_w, h))
        els.append(text_block(cx, y + h // 2 + (5 if len(lines) > 1 else 0), lines))
        y += h
        return h

    for i, lines in enumerate(steps_before):
        add_box(lines)
        if i < n_before - 1:
            els.append(arrow_down(cx, y, y + ARROW))
            y += ARROW + GAP

    els.append(arrow_down(cx, y, y + ARROW))
    y += ARROW + GAP // 2
    dec_y = y
    els.append(diamond(cx, dec_y + dec_h // 2, box_w - 20, dec_h))
    els.append(text_block(cx, dec_y + dec_h // 2 + 6, decision_lines))
    y = dec_y + dec_h

    # loop back label (visual hint — line to code step)
    loop_y = PAD_X + (n_before - 1) * (BOX_H + GAP + ARROW) + BOX_H // 2
    els.append(
        f'<path d="M {bx - 8} {y - dec_h // 2} L {bx - 28} {y - dec_h // 2} '
        f'L {bx - 28} {loop_y} L {bx} {loop_y}" fill="none" stroke="{FILL_LINE}" stroke-width="1"/>'
    )
    els.append(label_on_line(bx - 36, y - dec_h // 2 - 8, "n / 改"))

    els.append(arrow_down(cx, y, y + ARROW))
    mid_arrow = y + ARROW // 2
    els.append(label_on_line(cx + 42, mid_arrow, "y"))
    y += ARROW + GAP // 2

    for i, lines in enumerate(steps_after):
        add_box(lines)
        if i < n_after - 1:
            els.append(arrow_down(cx, y, y + ARROW))
            y += ARROW + GAP

    els.append("</svg>")
    out.write_text("\n  ".join(els) + "\n", encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    diag = root / "docs" / "assets" / "diagrams"

    render_dev_workflow(diag / "dev-workflow.svg")

    render_linear(
        [
            ["GitHub Issue", "随手记"],
            ["npm run", "req:list"],
            ["Cursor", "开始 issue"],
            ["milestone", "+ 实现"],
            ["PR", "关联 issue"],
            ["merge", "issue 关闭"],
        ],
        diag / "issue-to-merge.svg",
    )

    print("Wrote dev-workflow.svg and issue-to-merge.svg")


if __name__ == "__main__":
    main()

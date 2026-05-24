#!/usr/bin/env bash
# Regenerate docs/assets/diagrams/*.svg (local Python — no mermaid.ink clipping).
# Usage: bash scripts/regen-diagrams.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/generate-dark-flowchart.py"
echo "Done. Preview: docs/architecture/overview.md (Cmd+Shift+V)"

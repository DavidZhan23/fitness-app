#!/usr/bin/env bash
# Print mermaid.ink SVG URL for a .mmd file (paste into markdown image link).
# Usage: bash scripts/mermaid-ink-url.sh docs/assets/diagrams/system-architecture.mmd

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: bash scripts/mermaid-ink-url.sh <file.mmd>"
  exit 1
fi

python3 - "$FILE" << 'PY'
import base64, sys
path = sys.argv[1]
code = open(path, encoding="utf-8").read().strip()
b = base64.urlsafe_b64encode(code.encode()).decode().rstrip("=")
print(f"https://mermaid.ink/svg/{b}")
print()
print(f'![diagram](https://mermaid.ink/svg/{b})')
PY

#!/usr/bin/env bash
# Pack the Claude Desktop bundle. An .mcpb is a zip with a manifest at its root;
# Desktop registers the extension as a document type, so double-clicking one
# opens its install dialog.
#
# node_modules IS part of the artifact: Desktop runs its own bundled Node with
# no npm alongside it, so anything fetched at runtime is unavailable. Everything
# the server needs has to be in the zip.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-../lnb.mcpb}"
[ -d server/node_modules ] || (cd server && npm install --omit=dev --no-audit --no-fund)
rm -f "$OUT"
zip -q -r -X "$OUT" manifest.json server/ \
  -x '*/.DS_Store' '*/.bin/*' '*.md' '*/test/*' '*/tests/*' '*.map'
echo "built $OUT ($(du -h "$OUT" | cut -f1))"

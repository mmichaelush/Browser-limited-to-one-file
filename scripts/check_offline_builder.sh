#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Checking required files..."
required=(
  ".github/workflows/build.yaml"
  "README.md"
  "docs/index.html"
  "docs/main.js"
  "docs/proxy-example-express.js"
  "docs/DEPLOYMENT.md"
  "app/src/main/assets/content/index.html"
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "Missing: $f"; exit 1; }
  echo "  ✓ $f"
done

echo "[2/6] Checking workflow has offline inputs..."
rg -n "content_mode|local_content_path|application_id|enable_javascript|workflow_dispatch" .github/workflows/build.yaml >/dev/null

echo "[3/6] Checking Android offline config keys..."
rg -n "CONTENT_MODE|LOCAL_CONTENT_PATH|ENABLE_JAVASCRIPT|VIEW_MODE" app/build.gradle >/dev/null

echo "[4/6] JS syntax checks..."
node --check docs/main.js
node --check docs/proxy-example-express.js

echo "[5/6] Ensure no legacy network-security xml reference in manifest..."
if rg -n "networkSecurityConfig|usesCleartextTraffic|INTERNET|ACCESS_NETWORK_STATE|ACCESS_WIFI_STATE|CHANGE_WIFI_STATE" app/src/main/AndroidManifest.xml >/dev/null; then
  echo "Found unexpected network-related manifest entry"
  exit 1
fi

echo "[6/6] Summary"
echo "All local checks passed ✅"

#!/usr/bin/env bash
set -euo pipefail

# Example:
# GITHUB_TOKEN=ghp_xxx ./scripts/dispatch_workflow.sh \
#   --owner mmichaelush \
#   --repo Browser-limited-to-one-file \
#   --ref main \
#   --request-id run-001 \
#   --app-name "My Offline App" \
#   --application-id com.example.offline \
#   --content-mode HTML \
#   --local-content-path content/index.html \
#   --view-mode AUTO \
#   --enable-javascript false

owner=""
repo=""
ref="main"
request_id="manual-run"
app_name="My Offline App"
application_id="com.webview.myapplication"
content_mode="HTML"
local_content_path="content/index.html"
view_mode="AUTO"
enable_javascript="false"
icon_url=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) owner="$2"; shift 2;;
    --repo) repo="$2"; shift 2;;
    --ref) ref="$2"; shift 2;;
    --request-id) request_id="$2"; shift 2;;
    --app-name) app_name="$2"; shift 2;;
    --application-id) application_id="$2"; shift 2;;
    --content-mode) content_mode="$2"; shift 2;;
    --local-content-path) local_content_path="$2"; shift 2;;
    --view-mode) view_mode="$2"; shift 2;;
    --enable-javascript) enable_javascript="$2"; shift 2;;
    --icon-url) icon_url="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

: "${GITHUB_TOKEN:?Set GITHUB_TOKEN env var}"
[[ -n "$owner" ]] || { echo "--owner is required"; exit 1; }
[[ -n "$repo" ]] || { echo "--repo is required"; exit 1; }

payload=$(jq -n \
  --arg ref "$ref" \
  --arg request_id "$request_id" \
  --arg app_name "$app_name" \
  --arg application_id "$application_id" \
  --arg content_mode "$content_mode" \
  --arg local_content_path "$local_content_path" \
  --arg view_mode "$view_mode" \
  --argjson enable_javascript "$enable_javascript" \
  --arg icon_url "$icon_url" \
  '{
    ref: $ref,
    inputs: {
      request_id: $request_id,
      app_name: $app_name,
      application_id: $application_id,
      content_mode: $content_mode,
      local_content_path: $local_content_path,
      view_mode: $view_mode,
      enable_javascript: $enable_javascript
    }
  } | if $icon_url != "" then .inputs.icon_url = $icon_url else . end')

echo "Dispatching workflow to ${owner}/${repo}@${ref} ..."
http_code=$(curl -sS -o /tmp/dispatch_response.txt -w "%{http_code}" \
  -X POST "https://api.github.com/repos/${owner}/${repo}/actions/workflows/build.yaml/dispatches" \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" == "204" ]]; then
  echo "Success ✅ workflow dispatched"
  echo "Open: https://github.com/${owner}/${repo}/actions/workflows/build.yaml"
else
  echo "Failed ❌ HTTP ${http_code}"
  cat /tmp/dispatch_response.txt
  exit 1
fi

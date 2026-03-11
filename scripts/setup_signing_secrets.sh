#!/usr/bin/env bash
set -euo pipefail

# Copy-paste usage:
# 1) Create keystore once (or use existing):
#    keytool -genkeypair -v -keystore release-keystore.jks -alias myalias -keyalg RSA -keysize 2048 -validity 10000
# 2) Export env vars (replace values):
#    export REPO_OWNER="mmichaelush"
#    export REPO_NAME="Browser-limited-to-one-file"
#    export SIGNING_KEY_ALIAS="myalias"
#    export SIGNING_KEY_PASSWORD="change-me-key-pass"
#    export SIGNING_STORE_PASSWORD="change-me-store-pass"
#    export KEYSTORE_PATH="./release-keystore.jks"
# 3) Run:
#    ./scripts/setup_signing_secrets.sh

: "${REPO_OWNER:?Set REPO_OWNER}"
: "${REPO_NAME:?Set REPO_NAME}"
: "${SIGNING_KEY_ALIAS:?Set SIGNING_KEY_ALIAS}"
: "${SIGNING_KEY_PASSWORD:?Set SIGNING_KEY_PASSWORD}"
: "${SIGNING_STORE_PASSWORD:?Set SIGNING_STORE_PASSWORD}"
: "${KEYSTORE_PATH:?Set KEYSTORE_PATH}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "Keystore file not found: $KEYSTORE_PATH" >&2
  exit 1
fi

repo="${REPO_OWNER}/${REPO_NAME}"

key_b64=$(base64 < "$KEYSTORE_PATH" | tr -d '\n')

echo "Setting secrets in ${repo} ..."
# values are read from stdin so they are not exposed via process args
printf "%s" "$SIGNING_KEY_ALIAS" | gh secret set SIGNING_KEY_ALIAS --repo "$repo"
printf "%s" "$SIGNING_KEY_PASSWORD" | gh secret set SIGNING_KEY_PASSWORD --repo "$repo"
printf "%s" "$SIGNING_STORE_PASSWORD" | gh secret set SIGNING_STORE_PASSWORD --repo "$repo"
printf "%s" "$key_b64" | gh secret set KEYSTORE --repo "$repo"

echo "Done ✅"
echo "Secrets uploaded: SIGNING_KEY_ALIAS, SIGNING_KEY_PASSWORD, SIGNING_STORE_PASSWORD, KEYSTORE"

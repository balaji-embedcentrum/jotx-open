#!/bin/bash
# Publish the already-built @jotx-labs packages with a one-time password from your authenticator.
# Usage (from the repository root, after npm run build && npm run build:embed):
#   ./scripts/publish-otp.sh 123456
# Packages already on npm at this version are skipped, so it is safe to rerun with a new code.

set -u
OTP="${1:?Usage: ./scripts/publish-otp.sh <one-time code>}"
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./packages/core/package.json').version")

node scripts/prepare-publish.js > /dev/null
trap 'node scripts/prepare-publish.js --restore > /dev/null' EXIT

failed=0
for pkg in registry core standard-lib adapters react-renderer language cli embed; do
  name="@jotx-labs/$pkg"
  if npm view "$name@$VERSION" version > /dev/null 2>&1; then
    echo "✓ $name@$VERSION is already published"
    continue
  fi
  if (cd "packages/$pkg" && npm publish --access public --otp="$OTP" > /dev/null 2>&1); then
    echo "✅ $name@$VERSION published"
  else
    echo "❌ $name@$VERSION failed (the code may have expired; rerun with a new one)"
    failed=1
    break
  fi
done
exit $failed

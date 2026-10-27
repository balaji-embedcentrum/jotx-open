#!/bin/bash
# Publish the already-built @jotx-labs packages to npm.
# Usage (from the repository root, after npm run build && npm run build:embed), in a real terminal:
#   ./scripts/publish-otp.sh          # npm shows a link; approve each publish in the browser (passkey, security key, Touch ID)
#   ./scripts/publish-otp.sh 123456   # or pass a code from an authenticator app
# Packages already on npm at this version are skipped, so it is safe to rerun.

set -u
OTP="${1:-}"
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
  if [ -n "$OTP" ]; then
    publish() { npm publish --access public --otp="$OTP" > /dev/null 2>&1; }
  else
    echo "→ $name@$VERSION: approve in the browser when npm shows a link"
    publish() { npm publish --access public --auth-type=web; }
  fi
  if (cd "packages/$pkg" && publish); then
    echo "✅ $name@$VERSION published"
  else
    echo "❌ $name@$VERSION failed (rerun to continue; published packages are skipped)"
    failed=1
    break
  fi
done
exit $failed

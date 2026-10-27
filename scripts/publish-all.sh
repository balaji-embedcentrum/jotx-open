#!/bin/bash

# Publish all Jotx packages to npm in dependency order
# Must be run from repository root

set -e  # Exit on error

echo "🚀 Publishing Jotx packages to npm..."
echo ""

# Check if logged in to npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to npm. Run 'npm login' first."
    exit 1
fi

echo "✅ Logged in as: $(npm whoami)"
echo ""

# Prepare packages (convert file: to semver)
echo "📦 Preparing packages for publish..."
node scripts/prepare-publish.js
echo ""

# Build all packages
echo "🔨 Building all packages..."
npm run build
echo ""

# Array of packages in dependency order
packages=(
    "registry"
    "core"
    "standard-lib"
    "adapters"
    "react-renderer"
    "language"
    "cli"
    "embed"
)

# Publish each package
for pkg in "${packages[@]}"; do
    echo "📦 Publishing @jotx-labs/$pkg..."
    
    cd "packages/$pkg"
    
    # Check what will be published
    echo "  Checking package contents..."
    npm pack --dry-run > /dev/null 2>&1
    
    # Publish
    echo "  Publishing to npm..."
    npm publish --access public "$@"
    
    echo "  ✅ @jotx-labs/$pkg published!"
    echo ""
    
    cd ../..
done

# Restore file: dependencies for local development
echo "🔄 Restoring local development dependencies..."
node scripts/prepare-publish.js --restore
echo ""

echo "🎉 All packages published successfully!"
echo ""
echo "Verify at: https://www.npmjs.com/org/jotx-labs"

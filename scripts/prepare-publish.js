#!/usr/bin/env node
/**
 * Prepare packages for npm publish by converting file: dependencies to semver
 * 
 * Usage: node scripts/prepare-publish.js [--restore]
 *   --restore: Restore file: dependencies after publishing
 */

const fs = require('fs');
const path = require('path');

// Published packages depend on each other at the release version from version.ts
const VERSION = fs.readFileSync(path.join(__dirname, '../version.ts'), 'utf8').match(/JOTX_VERSION = ['"](.+)['"]/)[1];

const packages = [
    'registry',
    'core',
    'standard-lib',
    'adapters',
    'react-renderer',
    'language',
    'cli'
];

const dependencyMap = {
    '@jotx-labs/registry': `^${VERSION}`,
    '@jotx-labs/core': `^${VERSION}`,
    '@jotx-labs/adapters': `^${VERSION}`,
    '@jotx-labs/standard-lib': `^${VERSION}`,
    '@jotx-labs/react-renderer': `^${VERSION}`,
    '@jotx-labs/language': `^${VERSION}`
};

const restoreMap = {
    '@jotx-labs/registry': 'file:../registry',
    '@jotx-labs/core': 'file:../core',
    '@jotx-labs/adapters': 'file:../adapters',
    '@jotx-labs/standard-lib': 'file:../standard-lib',
    '@jotx-labs/react-renderer': 'file:../react-renderer',
    '@jotx-labs/language': 'file:../language'
};

const isRestore = process.argv.includes('--restore');
const mappingToUse = isRestore ? restoreMap : dependencyMap;

console.log(isRestore ? '🔄 Restoring file: dependencies...' : '📦 Preparing for npm publish...');
console.log(`   Version: ${VERSION}\n`);

for (const pkg of packages) {
    const pkgPath = path.join(__dirname, '..', 'packages', pkg, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.log(`   ⚠️  ${pkg}: package.json not found`);
        continue;
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let modified = false;

    // Update dependencies
    if (pkgJson.dependencies) {
        for (const [depName, targetVersion] of Object.entries(mappingToUse)) {
            if (pkgJson.dependencies[depName]) {
                const currentVersion = pkgJson.dependencies[depName];
                if (currentVersion !== targetVersion) {
                    pkgJson.dependencies[depName] = targetVersion;
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
        console.log(`   ✅ ${pkg}: dependencies updated`);
    } else {
        console.log(`   ⏭️  ${pkg}: no changes needed`);
    }
}

console.log('\n' + (isRestore ? '✅ Restored for local development!' : '✅ Ready for npm publish!'));

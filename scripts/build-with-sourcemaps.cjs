#!/usr/bin/env node

/**
 * Build script with proper source map chaining
 *
 * Process:
 * 1. TypeScript compilation generates .js and .js.map files
 * 2. Backup the TypeScript .js.map files
 * 3. Obfuscate the .js files (obfuscator also generates .js.map)
 * 4. Chain the TypeScript maps with obfuscator maps
 * 5. Clean up backup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = './dist';
const BACKUP_DIR = './dist-sourcemaps-backup';

/**
 * Find all .map files recursively
 */
function findMapFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findMapFiles(filePath, fileList);
    } else if (file.endsWith('.js.map')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Copy a file
 */
function copyFile(source, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, dest);
}

/**
 * Delete directory recursively
 */
function deleteDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Main build process
 */
async function main() {
  try {
    console.log('🔨 Building TypeScript with source maps...');

    // Step 1: Build TypeScript (generates .js and .js.map files)
    console.log('  → Running tsc');
    execSync('tsc', { stdio: 'inherit' });

    console.log('\n💾 Backing up TypeScript source maps...');

    // Step 2: Backup all .js.map files
    const mapFiles = findMapFiles(DIST_DIR);
    console.log(`  → Found ${mapFiles.length} source map files`);

    // Delete old backup if exists
    deleteDir(BACKUP_DIR);

    // Copy each map file to backup location
    mapFiles.forEach(mapFile => {
      const relativePath = path.relative(DIST_DIR, mapFile);
      const backupPath = path.join(BACKUP_DIR, relativePath);
      copyFile(mapFile, backupPath);
    });

    console.log(`  → Backed up to ${BACKUP_DIR}`);

    console.log('\n🔒 Obfuscating JavaScript...');

    // Step 3: Obfuscate (this will generate new source maps)
    console.log('  → Running javascript-obfuscator...');
    execSync('javascript-obfuscator dist --output dist --config obfuscator.config.json', {
      stdio: 'inherit'
    });

    console.log('\n🔗 Chaining source maps...');

    // Step 4: Chain the TypeScript source maps with obfuscator source maps
    console.log('  → Running source map chaining...');
    execSync('node scripts/chain-sourcemaps.cjs', { stdio: 'inherit' });

    // Step 5: Clean up backup
    console.log('🧹 Cleaning up...');
    deleteDir(BACKUP_DIR);

    console.log('\n✅ Build complete!');
    console.log('   → JavaScript is obfuscated');
    console.log('   → Source maps are chained (Obfuscated JS → Original TypeScript)');
    console.log('   → Use "npm run translate-error" to decode error logs\n');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);

    // Try to restore from backup if it exists
    if (fs.existsSync(BACKUP_DIR)) {
      console.log('\n⚠️  Attempting to clean up backup...');
      try {
        deleteDir(BACKUP_DIR);
        console.log('  → Backup cleaned up');
      } catch (cleanupError) {
        console.error('  → Failed to clean up:', cleanupError.message);
      }
    }

    process.exit(1);
  }
}

main();

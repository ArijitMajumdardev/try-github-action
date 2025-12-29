/**
 * Fix source maps after obfuscation
 *
 * The obfuscator creates source maps with "sourceMap" as the source file name.
 * This script reads the original TypeScript source maps and updates the obfuscated
 * source maps to reference the correct original .ts files.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

console.log('Fixing source maps...\n');

// Get all .js.map files
const sourceMapFiles = fs.readdirSync(distDir)
  .filter(file => file.endsWith('.js.map'));

for (const mapFile of sourceMapFiles) {
  const mapPath = path.join(distDir, mapFile);
  const jsFile = mapFile.replace('.js.map', '.js');

  console.log(`Processing: ${mapFile}`);

  try {
    // Read the obfuscated source map
    const sourceMapContent = fs.readFileSync(mapPath, 'utf-8');
    const sourceMap = JSON.parse(sourceMapContent);

    // Check if it has the generic "sourceMap" source
    if (sourceMap.sources && sourceMap.sources[0] === 'sourceMap') {
      // Try to infer the original TypeScript file name
      // For user.js -> ../src/user.ts
      // For index.js -> ../src/index.ts
      const baseName = jsFile.replace('.js', '');
      const originalTsFile = `../src/${baseName}.ts`;

      console.log(`  Updating source reference from "sourceMap" to "${originalTsFile}"`);

      // Update the source reference
      sourceMap.sources = [originalTsFile];

      // Write the updated source map
      fs.writeFileSync(mapPath, JSON.stringify(sourceMap), 'utf-8');
      console.log(`  ✓ Fixed`);
    } else {
      console.log(`  → Already has correct source: ${sourceMap.sources.join(', ')}`);
    }
  } catch (error) {
    console.error(`  ✗ Error processing ${mapFile}:`, error.message);
  }

  console.log('');
}

console.log('✅ Source map fixing complete!');

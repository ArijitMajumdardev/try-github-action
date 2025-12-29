#!/usr/bin/env node

/**
 * Source Map Chaining Script
 *
 * Chains TypeScript source maps with obfuscator source maps to create
 * a final source map that maps: Obfuscated JavaScript → Original TypeScript
 *
 * Process:
 * 1. TypeScript compiles: .ts → .js (generates map: TS → JS)
 * 2. Obfuscator transforms: .js → obfuscated.js (generates map: JS → Obfuscated)
 * 3. We chain them: (TS → JS) + (JS → Obfuscated) = (TS → Obfuscated)
 */

const fs = require('fs');
const path = require('path');
const { SourceMapConsumer, SourceMapGenerator } = require('source-map');

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
 * Chain two source maps together
 * @param {string} tsSourceMapPath - Path to TypeScript source map (TS → JS)
 * @param {string} obfSourceMapPath - Path to obfuscator source map (JS → Obfuscated)
 * @returns {Promise<string>} - The chained source map JSON
 */
async function chainSourceMaps(tsSourceMapPath, obfSourceMapPath) {
  try {
    // Read both source maps
    const tsMapContent = JSON.parse(fs.readFileSync(tsSourceMapPath, 'utf-8'));
    const obfMapContent = JSON.parse(fs.readFileSync(obfSourceMapPath, 'utf-8'));

    // Create consumers
    const tsConsumer = await new SourceMapConsumer(tsMapContent);
    const obfConsumer = await new SourceMapConsumer(obfMapContent);

    // Create a new generator for the chained map
    const generator = new SourceMapGenerator({
      file: obfMapContent.file || path.basename(obfSourceMapPath, '.map')
    });

    // Add source content from TypeScript map or read from files
    if (tsMapContent.sourcesContent) {
      tsMapContent.sources.forEach((source, index) => {
        generator.setSourceContent(source, tsMapContent.sourcesContent[index]);
      });
    } else {
      // If TypeScript map doesn't include source content, read the files manually
      tsMapContent.sources.forEach((source) => {
        try {
          // Resolve the source file path relative to the source map
          const sourceMapDir = path.dirname(tsSourceMapPath);
          const sourceFilePath = path.resolve(sourceMapDir, source);

          if (fs.existsSync(sourceFilePath)) {
            const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
            generator.setSourceContent(source, sourceContent);
          }
        } catch (error) {
          // Skip if we can't read the source file
          console.error(`    ⚠️  Could not read source: ${source}`);
        }
      });
    }

    // Iterate through all mappings in the obfuscated map
    obfConsumer.eachMapping((mapping) => {
      // For each mapping in obfuscated JS, look up where it came from in the intermediate JS
      if (!mapping.source) {
        return; // Skip mappings without a source
      }

      // Find the original TypeScript position
      const originalPosition = tsConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn
      });

      // Only add mapping if we found an original position
      if (originalPosition.source) {
        // Prefer the original TypeScript name over the obfuscated name
        // This ensures we see "getMyProgressCourseReportForSales" instead of "_0x1727fb"
        const finalName = originalPosition.name || mapping.name;

        generator.addMapping({
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          },
          original: {
            line: originalPosition.line,
            column: originalPosition.column
          },
          source: originalPosition.source,
          name: finalName  // Use original TypeScript name
        });
      }
    });

    tsConsumer.destroy();
    obfConsumer.destroy();

    return generator.toString();
  } catch (error) {
    console.error(`  ⚠️  Failed to chain ${path.basename(tsSourceMapPath)}: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  const DIST_DIR = './dist';
  const TS_BACKUP_DIR = './dist-sourcemaps-backup';

  console.log('🔗 Chaining source maps...\n');

  if (!fs.existsSync(TS_BACKUP_DIR)) {
    console.error('❌ Error: TypeScript source maps backup not found!');
    console.error('   The build script should have created this backup.');
    process.exit(1);
  }

  // Find all TypeScript source maps in backup
  const tsMapFiles = findMapFiles(TS_BACKUP_DIR);
  console.log(`  → Found ${tsMapFiles.length} TypeScript source maps in backup`);

  let chainedCount = 0;
  let failedCount = 0;

  for (const tsMapPath of tsMapFiles) {
    // Get the corresponding obfuscated map path
    const relativePath = path.relative(TS_BACKUP_DIR, tsMapPath);
    const obfMapPath = path.join(DIST_DIR, relativePath);

    if (!fs.existsSync(obfMapPath)) {
      console.error(`  ⚠️  Obfuscated map not found: ${relativePath}`);
      failedCount++;
      continue;
    }

    // Chain the maps
    const chainedMap = await chainSourceMaps(tsMapPath, obfMapPath);

    if (chainedMap) {
      // Write the chained map back to dist
      fs.writeFileSync(obfMapPath, chainedMap);
      chainedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`\n✅ Chained ${chainedCount} source maps`);
  if (failedCount > 0) {
    console.log(`⚠️  Failed to chain ${failedCount} source maps`);
  }

  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Stack Trace Translator
 *
 * Translates obfuscated stack traces back to original TypeScript source code using source maps.
 *
 * Usage:
 *   node demo-translator.cjs <error-log-file>
 *   node demo-translator.cjs "Error: Something went wrong\n    at file.js:1:234"
 *   cat error.log | node demo-translator.cjs
 *   pbpaste | node demo-translator.cjs   (macOS - paste from clipboard)
 */

const { SourceMapConsumer } = require('source-map');
const fs = require('fs');
const path = require('path');

/**
 * Translates an obfuscated stack trace to original source locations
 * @param {string} stackTrace - The obfuscated stack trace
 * @param {string} distDir - Directory containing the dist files and source maps
 * @returns {Promise<Array>} Array of translated stack frames
 */
async function translateStackTrace(stackTrace, distDir = './sourcemaps') {
  const lines = stackTrace.split('\n');
  const results = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Parse stack frame - matches patterns like:
    // at functionName (file.js:line:column)
    // at file.js:line:column
    // at C:\path\to\file.js:line:column
    const match = trimmedLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);

    if (match) {
      const functionName = match[1] ? match[1].trim() : '<anonymous>';
      let filePath = match[2] ? match[2].trim() : null;
      const lineNum = match[3] ? parseInt(match[3], 10) : null;
      const column = match[4] ? parseInt(match[4], 10) : null;

      if (filePath && lineNum !== null && column !== null) {
        // Handle absolute paths - extract just the filename relative to dist
        let sourceMapPath;
        

        if (path.isAbsolute(filePath)) {
          // Extract the relative path from dist directory
          const distIndex = filePath.indexOf('dist');
          if (distIndex !== -1) {
            const relativeFromDist = filePath.substring(distIndex + 5); // +5 for 'dist' + separator
            const jsFileName = path.basename(relativeFromDist);
            const dirPath = path.dirname(relativeFromDist);
            sourceMapPath = path.join(distDir, dirPath, `${jsFileName}.map`);
          } else {
            // Fallback: use just the filename
            const jsFileName = path.basename(filePath);
            sourceMapPath = path.join(distDir, `${jsFileName}.map`);
          }
        } else {
          // Relative path
          let jsFileName = path.basename(filePath);

          // If the file is already a .ts file (from Node.js --enable-source-maps),
          // we need to look for the corresponding .js.map file
          if (jsFileName.endsWith('.ts')) {
            jsFileName = jsFileName.replace('.ts', '.js');
          }

          sourceMapPath = path.join(distDir, `${jsFileName}.map`);
        }

        // Try to find and read the source map
        if (fs.existsSync(sourceMapPath)) {
          try {
            const sourceMapContent = fs.readFileSync(sourceMapPath, 'utf-8');
            const consumer = await new SourceMapConsumer(sourceMapContent);

            let originalPosition = consumer.originalPositionFor({
              line: lineNum,
              column: column,
            });
            // 🔁 Fallback: some obfuscators break column mappings
            if (!originalPosition.source && column > 0) {
              originalPosition = consumer.originalPositionFor({
                line: lineNum,
                column: 0,
              });
            }
            if (originalPosition.source) {
              // Get the actual source code line
              let sourceCodeLine = null;
              if (consumer.sourcesContent) {
                const sourceIndex = consumer.sources.indexOf(originalPosition.source);
                if (sourceIndex !== -1 && consumer.sourcesContent[sourceIndex]) {
                  const sourceLines = consumer.sourcesContent[sourceIndex].split('\n');
                  if (originalPosition.line && sourceLines[originalPosition.line - 1]) {
                    sourceCodeLine = sourceLines[originalPosition.line - 1].trim();
                  }
                }
              }

              const displayName =
                originalPosition.name &&
                  !originalPosition.name.startsWith('_0x')
                  ? originalPosition.name
                  : functionName;

              results.push({
                original: line,
                translated: {
                  file: originalPosition.source,
                  line: originalPosition.line,
                  column: originalPosition.column,
                  name: displayName,
                  sourceCode: sourceCodeLine,
                },
                obfuscated: {
                  file: filePath,
                  line: lineNum,
                  column: column,
                }
              });
            } else {
              results.push({
                original: line,
                translated: null,
                error: 'No original position found in source map'
              });
            }

            consumer.destroy();
          } catch (error) {
            results.push({
              original: line,
              translated: null,
              error: `Error reading source map: ${error.message}`
            });
          }
        } else {
          results.push({
            original: line,
            translated: null,
            error: `Source map not found: ${sourceMapPath}`
          });
        }
      } else {
        // Not a valid stack trace line with location info
        results.push({
          original: line,
          translated: null,
        });
      }
    } else {
      // Line doesn't match stack trace pattern (e.g., error message)
      results.push({
        original: line,
        translated: null,
      });
    }
  }

  return results;
}

/**
 * Pretty print the translation results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('TRANSLATED STACK TRACE');
  console.log('='.repeat(80) + '\n');

  for (const frame of results) {
    // Print the original obfuscated line
    console.log(`${frame.original}`);

    if (frame.translated && frame.translated.file) {
      // Print the translated location
      const loc = `${frame.translated.file}:${frame.translated.line}:${frame.translated.column}`;
      console.log(`  ↳ \x1b[32m${loc}\x1b[0m`); // Green color

      // Print function name if available
      if (frame.translated.name && frame.translated.name !== '<anonymous>') {
        console.log(`    Function: \x1b[36m${frame.translated.name}\x1b[0m`); // Cyan color
      }

      // Print the actual source code line
      if (frame.translated.sourceCode) {
        console.log(`    Code: \x1b[33m${frame.translated.sourceCode}\x1b[0m`); // Yellow color
      }
    } else if (frame.error) {
      console.log(`  ↳ \x1b[31m${frame.error}\x1b[0m`); // Red color
    }

    console.log('');
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Read input from stdin
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    let stackTrace = '';
    const args = process.argv.slice(2);

    // Check if we have arguments first (this takes precedence)
    if (args.length > 0) {
      // Read from file or command line argument
      const input = args[0];

      if (fs.existsSync(input)) {
        // It's a file
        console.log(`Reading from file: ${input}\n`);
        stackTrace = fs.readFileSync(input, 'utf-8');
      } else {
        // Treat as direct stack trace string
        stackTrace = input;
      }
    } else if (!process.stdin.isTTY) {
      // Reading from pipe/stdin (only if no arguments)
      console.log('Reading from stdin...');
      stackTrace = await readStdin();
    } else if (args.length === 0) {
      // No arguments and no piped input
      console.error('\nError: No input provided\n');
      console.log('Usage:');
      console.log('  node demo-translator.cjs <error-log-file>');
      console.log('  node demo-translator.cjs "Error: Something\\n    at file.js:1:234"');
      console.log('  cat error.log | node demo-translator.cjs');
      console.log('  pbpaste | node demo-translator.cjs   (macOS - paste from clipboard)\n');
      process.exit(1);
    }

    if (!stackTrace || stackTrace.trim().length === 0) {
      console.error('Error: Empty input');
      process.exit(1);
    }

    // Show original error log
    console.log('\n' + '='.repeat(80));
    console.log('ORIGINAL (OBFUSCATED) ERROR LOG');
    console.log('='.repeat(80) + '\n');
    console.log(stackTrace);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('Translating stack trace...\n');

    // Translate the stack trace
    const results = await translateStackTrace(stackTrace, './sourcemaps');

    // Print results
    printResults(results);

    // Summary
    const successCount = results.filter(r => r.translated && r.translated.file).length;
    const totalFrames = results.filter(r => r.original.trim().startsWith('at ')).length;

    console.log(`✓ Successfully translated ${successCount}/${totalFrames} stack frames\n`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { translateStackTrace, printResults };

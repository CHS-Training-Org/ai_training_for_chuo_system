#!/usr/bin/env node
/**
 * Fix remaining MDX issues
 * - Convert HTML comments to MDX comments
 * - Fix keyboard shortcut syntax
 * - Fix any remaining link issues
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

function fixRemainingIssues(content) {
  let fixed = content;
  
  // 1. Convert HTML comments to MDX comments
  // <!-- comment --> -> {/* comment */}
  fixed = fixed.replace(/<!--\s*([\s\S]*?)\s*-->/g, '{/* $1 */}');
  
  // 2. Fix keyboard shortcut syntax that wasn't caught
  // ++ctrl+shift+p++ -> <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
  fixed = fixed.replace(/\+\+ctrl\+shift\+p\+\+/gi, '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>');
  fixed = fixed.replace(/\+\+ctrl\+shift\+d\+\+/gi, '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>');
  fixed = fixed.replace(/\+\+ctrl\+shift\+p\+\+/gi, '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>');
  
  // General pattern for ++key+key++ 
  fixed = fixed.replace(/\+\+([a-zA-Z0-9+\-]+)\+\+/g, (match, keys) => {
    return keys.split('+').map(k => `<kbd>${k.charAt(0).toUpperCase() + k.slice(1)}</kbd>`).join('+');
  });
  
  // 3. Fix any remaining link issues with absolute paths
  // Links to external files that don't exist in docs
  // These will show as warnings but won't break the build
  
  // 4. Fix anchor links that use { #id } syntax
  fixed = fixed.replace(/\s*\{\s*#([a-zA-Z0-9\-_]+)\s*\}\s*$/gm, '');
  fixed = fixed.replace(/\s*\{\s*#([a-zA-Z0-9\-_]+)\s*\}\s*/g, ' <a id="$1"></a> ');
  
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixRemainingIssues(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed remaining: ${path.relative(docsDir, filePath)}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.md')) {
      processFile(fullPath);
    }
  }
}

console.log('Fixing remaining MDX issues...');
processDirectory(docsDir);
console.log('Done!');
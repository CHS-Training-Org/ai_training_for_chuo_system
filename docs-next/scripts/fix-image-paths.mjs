#!/usr/bin/env node
/**
 * Fix image paths for diagrams
 * Convert relative paths to absolute /diagrams/ paths
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

function fixImagePaths(content) {
  let fixed = content;
  
  // Fix diagram image references
  // ../diagrams/... -> /diagrams/...
  fixed = fixed.replace(/\.\.\/diagrams\//g, '/diagrams/');
  
  // diagrams/... (without leading ..) -> /diagrams/...
  fixed = fixed.replace(/^(!\[[^\]]*\]\()diagrams\//gm, '$1/diagrams/');
  
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixImagePaths(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed images: ${path.relative(docsDir, filePath)}`);
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

console.log('Fixing diagram image paths...');
processDirectory(docsDir);
console.log('Done!');
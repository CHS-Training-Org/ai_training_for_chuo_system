#!/usr/bin/env node
/**
 * Fix admonition closing tags
 * Add ::: at the end of admonition blocks
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

function fixAdmonitionClosures(content) {
  let fixed = content;
  const lines = fixed.split('\n');
  const result = [];
  
  let inAdmonition = false;
  let admonitionIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts an admonition
    const admonitionMatch = line.match(/^:::(tip|note|warning|danger|info)\b/);
    if (admonitionMatch) {
      inAdmonition = true;
      // Calculate the indent of the admonition content
      admonitionIndent = line.length - line.trimStart().length;
      result.push(line);
      continue;
    }
    
    if (inAdmonition) {
      // Check if we've reached the end of the admonition
      // End conditions: empty line followed by non-indented content, or ---, or another heading, or another admonition
      const trimmed = line.trim();
      const currentIndent = line.length - line.trimStart().length;
      
      // Check if next line exists and is not indented (or less indented than admonition content)
      const nextLine = lines[i + 1] || '';
      const nextTrimmed = nextLine.trim();
      const nextIndent = nextLine.length - nextLine.trimStart().length;
      
      // End admonition if:
      // 1. Next line is a horizontal rule (---)
      // 2. Next line is a heading (# )
      // 3. Next line starts another admonition (:::)
      // 4. Next line is not indented and not empty (content at same level)
      // 5. We're at the end of file
      
      const shouldClose = 
        nextTrimmed === '---' ||
        nextTrimmed.startsWith('# ') ||
        nextTrimmed.startsWith(':::') ||
        (nextTrimmed !== '' && nextIndent <= admonitionIndent && !nextTrimmed.startsWith(' ')) ||
        i === lines.length - 1;
      
      result.push(line);
      
      if (shouldClose) {
        result.push(':::');
        inAdmonition = false;
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixAdmonitionClosures(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed admonitions: ${path.relative(docsDir, filePath)}`);
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

console.log('Fixing admonition closures...');
processDirectory(docsDir);
console.log('Done!');
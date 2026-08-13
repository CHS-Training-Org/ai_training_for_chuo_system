#!/usr/bin/env node
/**
 * Fix specific remaining issues
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

function fixSpecificIssues(content) {
  let fixed = content;
  
  // Fix keyboard shortcuts in getting-started.md
  fixed = fixed.replace(/<kbd>ctrl\+shift\+p<\/kbd>/gi, '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>');
  fixed = fixed.replace(/<kbd>ctrl\+shift\+d<\/kbd>/gi, '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>');
  
  // Fix URL in tables - wrap in code tags to prevent HTML parsing
  fixed = fixed.replace(/\| <(https?:\/\/[^>]+)> \|/g, '| `$1` |');
  fixed = fixed.replace(/\| <(https?:\/\/[^>]+)>$/gm, '| `$1`');
  
  // Fix <br> tags to be self-closing
  fixed = fixed.replace(/<br>/g, '<br />');
  
  // Fix <input> tags to be self-closing
  fixed = fixed.replace(/<input([^>]*[^/])>/g, '<input$1 />');
  
  // Fix <img> tags to be self-closing
  fixed = fixed.replace(/<img([^>]*[^/])>/g, '<img$1 />');
  
  // Fix <hr> tags
  fixed = fixed.replace(/<hr>/g, '<hr />');
  
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixSpecificIssues(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed specific: ${path.relative(docsDir, filePath)}`);
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

console.log('Fixing specific issues...');
processDirectory(docsDir);
console.log('Done!');
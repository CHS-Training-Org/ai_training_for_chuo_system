#!/usr/bin/env node
/**
 * Fix MDX syntax issues for Docusaurus
 * - Convert !!! admonitions to ::: syntax
 * - Convert ++key++ keyboard shortcuts to <kbd> syntax
 * - Fix anchor links { #id } to standard markdown
 * - Fix HTML tags that cause issues
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

function fixMdxSyntax(content) {
  let fixed = content;
  
  // 1. Convert !!! admonitions to ::: syntax
  // !!! tip "Title" -> :::tip Title
  // !!! note "Title" -> :::note Title
  // !!! warning "Title" -> :::warning Title
  // !!! danger "Title" -> :::danger Title
  // !!! info "Title" -> :::info Title
  fixed = fixed.replace(/^!!!\s+(tip|note|warning|danger|info)\s+"([^"]+)"\s*$/gm, ':::$1 $2');
  fixed = fixed.replace(/^!!!\s+(tip|note|warning|danger|info)\s*$/gm, '::$1');
  
  // Indented content after admonition -> add ::: at end
  // This is more complex - we need to find the end of the admonition block
  // For now, let's handle the closing by finding the next non-indented line or ---
  
  // 2. Convert ++key++ to <kbd>key</kbd>
  fixed = fixed.replace(/\+\+([a-zA-Z0-9+\-]+)\+\+/g, '<kbd>$1</kbd>');
  
  // 3. Fix anchor links { #id } - these are not standard markdown
  // They should be removed or converted to standard HTML anchors
  fixed = fixed.replace(/\s*\{\s*#([a-zA-Z0-9\-_]+)\s*\}\s*$/gm, '');
  fixed = fixed.replace(/\s*\{\s*#([a-zA-Z0-9\-_]+)\s*\}\s*/g, ' <a id="$1"></a> ');
  
  // 4. Fix HTML image tags that might be unclosed
  // <img ...> -> <img ... />
  fixed = fixed.replace(/<img([^>]*[^/])>/g, '<img$1 />');
  
  // 5. Fix <input> tags that need closing
  fixed = fixed.replace(/<input([^>]*[^/])>/g, '<input$1 />');
  
  // 6. Remove mermaid diagram image references that don't exist
  // These will be handled by the mermaid plugin instead
  
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixMdxSyntax(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed MDX: ${path.relative(docsDir, filePath)}`);
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

console.log('Fixing MDX syntax...');
processDirectory(docsDir);
console.log('Done!');
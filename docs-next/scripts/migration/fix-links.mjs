#!/usr/bin/env node
/**
 * Internal link fixer for Docusaurus migration
 * Fixes links from Zensical paths to Docusaurus paths
 */

import fs from 'fs';
import path from 'path';

const docsDir = 'docs';

// Link mapping: old pattern -> new pattern
const linkMappings = [
  // Guide files (now in curriculumSidebar or developSidebar)
  { from: './guide/', to: '../' },
  { from: '../guide/', to: '../../' },
  { from: 'guide/', to: '' },
  
  // Specific guide files -> new locations
  { from: './getting-started.md', to: '../getting-started.md' },
  { from: './curriculum.md', to: '../curriculum.md' },
  { from: './ai-tools-guide.md', to: '../ai-tools-guide.md' },
  { from: './claude-code-best-practices.md', to: '../claude-code-best-practices.md' },
  { from: './glossary.md', to: '../glossary.md' },
  { from: './dev-workflow.md', to: '../develop/dev-workflow.md' },
  { from: './coding-conventions.md', to: '../develop/coding-conventions.md' },
  { from: './enhancement-catalog.md', to: '../develop/enhancement-catalog.md' },
  { from: './review-criteria.md', to: '../develop/review-criteria.md' },
  { from: './troubleshooting.md', to: '../develop/troubleshooting.md' },
  { from: './operations-guide.md', to: '../operations/operations-guide.md' },
  { from: './issue-registration.md', to: '../operations/issue-registration.md' },
  { from: './learning-effectiveness.md', to: '../operations/learning-effectiveness.md' },
  
  // Spec files (now in specSidebar)
  { from: './spec/', to: '../spec/' },
  { from: '../spec/', to: '../../spec/' },
  { from: 'spec/', to: 'spec/' },
  
  { from: './requirements.md', to: '../requirements.md' },
  { from: './screen-spec.md', to: '../screen-spec.md' },
  { from: './api-spec.md', to: '../api-spec.md' },
  { from: './er-diagram.md', to: '../er-diagram.md' },
  { from: './overview.md', to: '../overview.md' },
  { from: './aidlc-adoption.md', to: '../aidlc-adoption.md' },
  { from: './aidlc-audit.md', to: '../aidlc-audit.md' },
  { from: './aidlc-state.md', to: '../aidlc-state.md' },
  
  // Enhancements
  { from: './enhancements/', to: '../spec/enhancements/' },
  { from: '../enhancements/', to: '../../spec/enhancements/' },
  
  // Reference files
  { from: './ARCHITECTURE.md', to: '../architecture.md' },
  { from: '../ARCHITECTURE.md', to: '../../architecture.md' },
  { from: './design.md', to: '../design.md' },
  { from: '../design.md', to: '../../design.md' },
  { from: './spec/index.md', to: '../spec-index.md' },
  
  // Decision/ADR
  { from: './decision/', to: '../reference/adr/' },
  { from: '../decision/', to: '../../reference/adr/' },
  { from: 'decision/', to: 'reference/adr/' },
  
  // Claude code
  { from: './claude/', to: '../reference/claude-code/' },
  { from: '../claude/', to: '../../reference/claude-code/' },
  
  // Absolute paths from Docs/
  { from: 'Docs/guide/', to: '../' },
  { from: 'Docs/spec/', to: '../spec/' },
  { from: 'Docs/decision/', to: '../reference/adr/' },
  { from: 'Docs/claude/', to: '../reference/claude-code/' },
  { from: 'Docs/', to: '../' },
];

function fixLinks(content) {
  let fixed = content;
  
  for (const mapping of linkMappings) {
    // Fix markdown links: [text](path) -> [text](newpath)
    const regex = new RegExp(`\\(${mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^)]*)\\)`, 'g');
    fixed = fixed.replace(regex, (match, anchor) => {
      return `(${mapping.to}${anchor})`;
    });
  }
  
  // Fix relative links that start with ./ or ../ but aren't caught above
  // Handle [text](./file.md#anchor) patterns more carefully
  fixed = fixed.replace(/\[([^\]]+)\]\(\.\/([^#)]+)(#[^)]*)?\)/g, (match, text, file, anchor) => {
    const newFile = file.replace(/\.md$/, '');
    // Check if it's a known file
    return `[${text}](../${newFile}${anchor || ''})`;
  });
  
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixLinks(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed links: ${path.relative(docsDir, filePath)}`);
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

console.log('Fixing internal links...');
processDirectory(docsDir);
console.log('Done!');
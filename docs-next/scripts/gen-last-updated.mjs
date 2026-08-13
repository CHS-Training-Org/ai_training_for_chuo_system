#!/usr/bin/env node
/**
 * Generate last_updated frontmatter from git log
 * Run this before building to populate last_updated dates
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const docsDir = 'docs';

function getGitLogDate(filePath) {
  try {
    // Get the date of the last commit that modified this file
    const date = execSync(
      `git log -1 --format="%cI" -- "${filePath}"`,
      { encoding: 'utf-8', cwd: process.cwd() }
    ).trim();
    return date || null;
  } catch {
    return null;
  }
}

function updateLastUpdated(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  
  const gitDate = getGitLogDate(filePath);
  if (!gitDate) {
    return false;
  }
  
  // Only update if different or not present
  if (data.last_updated === gitDate) {
    return false;
  }
  
  data.last_updated = gitDate;
  
  const output = matter.stringify(body, data);
  fs.writeFileSync(filePath, output);
  return true;
}

function processDirectory(dir) {
  let updatedCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      updatedCount += processDirectory(fullPath);
    } else if (entry.name.endsWith('.md')) {
      if (updateLastUpdated(fullPath)) {
        updatedCount++;
        console.log(`Updated last_updated: ${path.relative(docsDir, fullPath)}`);
      }
    }
  }
  return updatedCount;
}

console.log('Generating last_updated from git log...');
const count = processDirectory(docsDir);
console.log(`Done! Updated ${count} files.`);
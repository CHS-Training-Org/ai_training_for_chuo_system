#!/usr/bin/env node
/**
 * Fix frontmatter references to new paths
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDir = 'docs';

const referenceMappings = {
  'Docs/guide/getting-started.md': '../getting-started.md',
  'Docs/guide/dev-workflow.md': '../develop/dev-workflow.md',
  'Docs/guide/ai-tools-guide.md': '../ai-tools-guide.md',
  'Docs/guide/glossary.md': '../glossary.md',
  'Docs/guide/curriculum.md': '../curriculum.md',
  'Docs/guide/claude-code-best-practices.md': '../claude-code-best-practices.md',
  'Docs/guide/enhancement-catalog.md': '../develop/enhancement-catalog.md',
  'Docs/guide/review-criteria.md': '../develop/review-criteria.md',
  'Docs/guide/troubleshooting.md': '../develop/troubleshooting.md',
  'Docs/guide/operations-guide.md': '../operations/operations-guide.md',
  'Docs/guide/issue-registration.md': '../operations/issue-registration.md',
  'Docs/guide/learning-effectiveness.md': '../operations/learning-effectiveness.md',
  'Docs/spec/overview.md': '../overview.md',
  'Docs/spec/requirements.md': '../requirements.md',
  'Docs/spec/screen-spec.md': '../screen-spec.md',
  'Docs/spec/api-spec.md': '../api-spec.md',
  'Docs/spec/er-diagram.md': '../er-diagram.md',
  'Docs/spec/enhancements/index.md': '../spec/enhancements/index.md',
  'Docs/spec/aidlc-adoption.md': '../aidlc-adoption.md',
  'Docs/spec/aidlc-audit.md': '../aidlc-audit.md',
  'Docs/spec/aidlc-state.md': '../aidlc-state.md',
  'Docs/ARCHITECTURE.md': '../architecture.md',
  'Docs/design.md': '../design.md',
  'Docs/decision/README.md': '../reference/adr/README.md',
  'Docs/claude/index.md': '../reference/claude-code/index.md',
  'Docs/claude/agent-config.md': '../reference/claude-code/agent-config.md',
  '../ARCHITECTURE.md': '../../architecture.md',
  '../design.md': '../../design.md',
  '../decision/README.md': '../../reference/adr/README.md',
  '../claude/index.md': '../../reference/claude-code/index.md',
  '../spec/overview.md': '../../overview.md',
  '../spec/requirements.md': '../../requirements.md',
};

function fixReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  
  if (!data.references) return;
  
  let changed = false;
  const newReferences = data.references.map(ref => {
    if (referenceMappings[ref]) {
      changed = true;
      return referenceMappings[ref];
    }
    return ref;
  });
  
  if (changed) {
    data.references = newReferences;
    const output = matter.stringify(body, data);
    fs.writeFileSync(filePath, output);
    console.log(`Fixed references: ${path.relative(docsDir, filePath)}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.md')) {
      fixReferences(fullPath);
    }
  }
}

console.log('Fixing frontmatter references...');
processDirectory(docsDir);
console.log('Done!');
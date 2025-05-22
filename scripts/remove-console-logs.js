#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Extensions to search
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', '.next', 'supabase/functions'];

// Find all TypeScript/JavaScript files recursively
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !excludeDirs.includes(file)) {
      fileList = findFiles(filePath, fileList);
    } else if (
      stat.isFile() && 
      extensions.includes(path.extname(file))
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace console.log statements
  const logRegex = /(console\.log\([^)]*\);?)/g;
  if (logRegex.test(content)) {
    content = content.replace(logRegex, '// Removed console.log');
    modified = true;
  }
  
  // Replace console.error statements with silent error handling
  const errorRegex = /console\.error\([^)]*\);?/g;
  if (errorRegex.test(content)) {
    content = content.replace(errorRegex, '// Silent error handling for production');
    modified = true;
  }
  
  // Write changes to file
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    // Removed console.log
    return true;
  }
  
  return false;
}

// Main function
function main() {
  // Removed console.log
  
  // Get all files
  const rootDir = path.resolve(__dirname, '..');
  const files = findFiles(rootDir);
  
  let modifiedCount = 0;
  
  // Process each file
  files.forEach(file => {
    const wasModified = processFile(file);
    if (wasModified) modifiedCount++;
  });
  
  // Removed console.log
}

main(); 
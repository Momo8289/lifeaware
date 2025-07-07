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
  
  // Only remove console.log statements (not console.error, console.warn, etc.)
  // This regex is more specific to avoid removing important logging
  const logRegex = /console\.log\s*\([^)]*\)\s*;?/g;
  if (logRegex.test(content)) {
    content = content.replace(logRegex, '// Development log removed');
    modified = true;
  }
  
  // DO NOT remove console.error - these are important for debugging
  // Instead, you could optionally replace them with a proper logging service
  // Example (commented out):
  // const errorRegex = /console\.error\s*\(/g;
  // content = content.replace(errorRegex, 'logger.error(');
  
  // Write changes to file
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Function to restore files that were incorrectly modified
function restoreErrorHandling(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Restore the silent error handling comments with proper error handling
  const silentErrorRegex = /\/\/ Silent error handling for production/g;
  if (silentErrorRegex.test(content)) {
    content = content.replace(silentErrorRegex, 'console.error("Error:", error)');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Restored error handling in: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const shouldRestore = args.includes('--restore');
  
  if (shouldRestore) {
    console.log('Restoring error handling in files...');
  } else {
    console.log('Removing console.log statements...');
  }
  
  // Get all files
  const rootDir = path.resolve(__dirname, '..');
  const files = findFiles(rootDir);
  
  let modifiedCount = 0;
  
  // Process each file
  files.forEach(file => {
    const wasModified = shouldRestore ? restoreErrorHandling(file) : processFile(file);
    if (wasModified) modifiedCount++;
  });
  
  console.log(`Modified ${modifiedCount} files`);
}

main();
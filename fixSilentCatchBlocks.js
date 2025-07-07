const fs = require("fs");
const path = require("path");

const projectRoot = process.argv[2] || "./";

// Regex to match `catch (e) {
  console.error(e); // Automatically added
}` or `catch (e) {
  console.error(e); // Automatically added
}` or just whitespace inside
const silentCatchRegex = /catch\s*\((\w*)\)\s*\{\s*(\/\/.*)?\s*\}/g;

// You can change this to insert `console.error(...)` or `TODO` inside catch
const insertHandler = (errorVar) =>
  `catch (${errorVar}) {\n  console.error(${errorVar}); // Automatically added\n}`;

function isCodeFile(filename) {
  return /\.(js|ts|jsx|tsx)$/.test(filename);
}

function walkAndFix(dir) {
  let modifiedFiles = [];

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!/node_modules/.test(fullPath)) walkAndFix(fullPath);
    } else if (isCodeFile(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");

      const matches = [...content.matchAll(silentCatchRegex)];

      if (matches.length > 0) {
        let fixedContent = content;

        matches.forEach((match) => {
          const original = match[0];
          const errorVar = match[1] || "err";
          const replacement = insertHandler(errorVar);
          fixedContent = fixedContent.replace(original, replacement);
        });

        fs.writeFileSync(fullPath, fixedContent, "utf-8");
        modifiedFiles.push(fullPath);
      }
    }
  });

  return modifiedFiles;
}

const modified = walkAndFix(projectRoot);

if (modified.length === 0) {
  console.log("✅ No silent catch blocks found.");
} else {
  console.log(`🚀 Fixed ${modified.length} file(s) with silent catch blocks:\n`);
  modified.forEach((file) => console.log("✔️", file));
}

const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

const replacements = [
  { regex: /text-blue-900/g, replacement: 'text-blue-500' },
  { regex: /color:\s*['"]#1e3a8a['"]/g, replacement: "color: '#3b82f6'" },
  { regex: /text-\['#1e3a8a'\]/g, replacement: "text-blue-500" },
  { regex: /text-blue-950/g, replacement: 'text-blue-600' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.css') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;

      for (const rule of replacements) {
        newContent = newContent.replace(rule.regex, rule.replacement);
      }

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated text colors: ${fullPath}`);
      }
    }
  }
}

processDirectory(targetDir);
console.log('Text color fix complete!');

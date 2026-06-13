const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

const replacements = [
  { regex: /orange-500/g, replacement: 'teal-500' },
  { regex: /orange-600/g, replacement: 'teal-600' },
  { regex: /orange-400/g, replacement: 'teal-400' },
  { regex: /#f9731620/g, replacement: '#14b8a620' }, // Teal-500 with 20% opacity
  { regex: /#f97316/g, replacement: '#14b8a6' }, // Teal-500 hex
  { regex: /#ea580c/g, replacement: '#0d9488' }, // Teal-600 hex
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
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(targetDir);
console.log('Theme replacement complete!');

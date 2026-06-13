const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

const replacements = [
  { regex: /teal-500/g, replacement: 'fuchsia-500' },
  { regex: /teal-600/g, replacement: 'fuchsia-600' },
  { regex: /teal-400/g, replacement: 'fuchsia-400' },
  { regex: /#14b8a620/g, replacement: '#d946ef20' }, // Fuchsia-500 with 20% opacity
  { regex: /#14b8a6/g, replacement: '#d946ef' }, // Fuchsia-500 hex
  { regex: /#0d9488/g, replacement: '#c026d3' }, // Fuchsia-600 hex
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
console.log('Theme replacement to Fuchsia complete!');

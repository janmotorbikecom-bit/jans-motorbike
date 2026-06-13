const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

const replacements = [
  { regex: /fuchsia-500/g, replacement: 'blue-900' },
  { regex: /fuchsia-600/g, replacement: 'blue-950' },
  { regex: /fuchsia-400/g, replacement: 'blue-800' },
  { regex: /#d946ef20/g, replacement: '#1e3a8a20' }, // blue-900 with 20% opacity
  { regex: /#d946ef/g, replacement: '#1e3a8a' }, // blue-900 hex
  { regex: /#c026d3/g, replacement: '#172554' }, // blue-950 hex
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
console.log('Theme replacement to Classic Navy complete!');

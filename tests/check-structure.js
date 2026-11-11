// Quick structure check run by the build: required files exist and every relative import in js/ resolves.
const fs = require('fs');
const path = require('path');

const required = ['index.html', 'package.json', 'capacitor.config.json', 'css/style.css', 'js/app.js'];
const problems = required.filter((f) => !fs.existsSync(f)).map((f) => `Missing file: ${f}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
}

if (fs.existsSync('js')) {
  for (const file of walk('js')) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), m[1]);
      if (!fs.existsSync(target)) problems.push(`${file} imports ${m[1]}, which does not exist`);
    }
  }
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Structure OK');

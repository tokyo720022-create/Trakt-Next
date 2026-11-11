// Quick structure check run by the build: files exist, boot.js loads every script and view, every $('id') used in the code has an element.
const fs = require('fs');
const path = require('path');

const problems = [];
const need = ['index.html', 'boot.js', 'package.json', 'capacitor.config.json', 'css/base.css', 'css/components.css', 'css/screens.css'];
need.filter((f) => !fs.existsSync(f)).forEach((f) => problems.push(`Missing file: ${f}`));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name).split(path.sep).join('/')]);

if (fs.existsSync('boot.js')) {
  const boot = fs.readFileSync('boot.js', 'utf8');
  const listed = [...boot.matchAll(/'((?:views|js)\/[^']+)'/g)].map((m) => m[1]);
  listed.filter((f) => !fs.existsSync(f)).forEach((f) => problems.push(`boot.js lists ${f}, which does not exist`));
  ['js', 'views'].filter((d) => fs.existsSync(d)).flatMap(walk).filter((f) => !listed.includes(f))
    .forEach((f) => problems.push(`${f} is not loaded by boot.js`));

  const html = ['index.html', ...listed.filter((f) => f.endsWith('.html'))].filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const f of listed.filter((x) => x.endsWith('.js') && fs.existsSync(x))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\$\('([^']+)'\)/g)) if (!ids.has(m[1])) problems.push(`${f} uses the id "${m[1]}", which no view has`);
  }
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Structure OK');

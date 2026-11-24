const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'frontend');
const target = path.join(root, 'public');
const backendSource = path.join(root, 'backend');
const backendTarget = path.join(source, '_server');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'public' || entry.name === '.git') continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

fs.rmSync(backendTarget, { recursive: true, force: true });
copyDir(backendSource, backendTarget);
console.log('Vercel build: backend sincronizado em frontend/_server');

fs.rmSync(target, { recursive: true, force: true });
copyDir(source, target);
console.log('Vercel build: frontend copiado para public/');

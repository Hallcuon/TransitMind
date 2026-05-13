import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());

const pairs = [
  {
    example: path.join(root, 'backend', '.env.example'),
    target: path.join(root, 'backend', '.env'),
  },
  {
    example: path.join(root, 'frontend', '.env.example'),
    target: path.join(root, 'frontend', '.env'),
  },
];

let changed = false;

for (const { example, target } of pairs) {
  if (fs.existsSync(target)) continue;
  if (!fs.existsSync(example)) {
    throw new Error(`Missing env example file: ${example}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(example, target);
  console.log(`Created ${path.relative(root, target)} from .env.example`);
  changed = true;
}

if (!changed) {
  console.log('Env files already exist. Skipping.');
}


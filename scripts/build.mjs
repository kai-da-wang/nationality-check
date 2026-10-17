import { cp, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(projectRoot, 'dist');
const assetsRoot = join(projectRoot, 'assets');

await mkdir(assetsRoot, { recursive: true });
for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name.endsWith('.js') || entry.name === 'styles.css')) {
    await copyFile(join(sourceRoot, entry.name), join(assetsRoot, entry.name));
  }
}
await cp(join(sourceRoot, 'fonts'), join(assetsRoot, 'fonts'), { recursive: true });
await cp(join(sourceRoot, 'assets'), assetsRoot, { recursive: true });

const html = (await readFile(join(sourceRoot, 'index.html'), 'utf8'))
  .replace(/(\b(?:href|src)\s*=\s*["'])(?:\.\/)?(styles\.css|app\.js)(?=[?#"'])/gi, '$1assets/$2')
  .replace(/(\b(?:href|src)\s*=\s*["'])(?:\.\/)?(fonts\/)/gi, '$1assets/$2');
await writeFile(join(projectRoot, 'index.html'), html);
console.log('Generated index.html and assets/ from dist/. Existing assets were preserved.');

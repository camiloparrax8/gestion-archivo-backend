/**
 * Verificación de “build” para este backend Node (sin compilación):
 * - Sintaxis de todos los .js en src/, api/ y scripts/
 * - Carga del grafo de módulos (require app.js)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

function collectJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      collectJsFiles(full, acc);
    } else if (ent.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

const archivos = [];
for (const rel of ['src', 'api', 'scripts']) {
  collectJsFiles(path.join(root, rel), archivos);
}

if (!archivos.length) {
  console.error('Build: no se encontraron archivos .js en src/, api/ o scripts/.');
  process.exit(1);
}

console.log(`Build: comprobando sintaxis de ${archivos.length} archivo(s)...`);
for (const archivo of archivos) {
  execSync(`node --check ${JSON.stringify(archivo)}`, { stdio: 'inherit', cwd: root });
}

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
console.log('Build: cargando módulos de la aplicación...');
require(path.join(root, 'src', 'app'));

console.log('Build OK: sintaxis válida y dependencias cargadas correctamente.');

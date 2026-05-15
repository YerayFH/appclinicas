/**
 * security-audit.js
 * Auditoría estática básica para detectar patrones peligrosos en AppClinicas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const DANGEROUS_PATTERNS = [
  { regex: /\.innerHTML\s*=/g, message: 'Uso de innerHTML detectado. Asegúrate de escapar los datos con escHtml().' },
  { regex: /document\.write\s*\(/g, message: 'document.write() detectado. Es una práctica obsoleta y peligrosa.' },
  { regex: /eval\s*\(/g, message: 'eval() detectado. Riesgo crítico de seguridad.' },
  { regex: /localStorage\.setItem\s*\(/g, message: 'Guardado en localStorage detectado. Verifica que no se guarden datos PII sensibles.' }
];

const IGNORE_DIRS = ['.git', 'node_modules', 'dist', 'tests', 'scripts'];
const EXTENSIONS = ['.html', '.js'];

let findings = 0;

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(ROOT, filePath);

  DANGEROUS_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      console.warn(`[!] ${pattern.message}`);
      console.warn(`    Archivo: ${relativePath}:${line}\n`);
      findings++;
    }
  });
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) walkDir(fullPath);
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        auditFile(fullPath);
      }
    }
  });
}

console.log('🔍 Iniciando auditoría de seguridad estática...\n');
walkDir(ROOT);

if (findings > 0) {
  console.log(`⚠️ Se han encontrado ${findings} puntos de atención. Por favor, revísalos.`);
} else {
  console.log('✅ No se detectaron patrones peligrosos evidentes.');
}

// No bloqueamos el build por ahora, pero informamos.
process.exit(0);

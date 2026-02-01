#!/usr/bin/env node
/**
 * Cria ícones mínimos (1x1 PNG) para a extensão se não existirem.
 * Substitua por ícones reais (16x16, 48x48, 128x128) quando tiver.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const extensionDir = path.join(projectRoot, 'extension');
const iconsDir = path.join(extensionDir, 'icons');

// PNG 1x1 transparente (mínimo válido)
const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(MINIMAL_PNG_BASE64, 'base64');

const sizes = [16, 48, 128];

if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach((size) => {
  const file = path.join(iconsDir, `icon-${size}.png`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, buffer);
    console.log('  ✓ Criado', `icon-${size}.png`);
  }
});

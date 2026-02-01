#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const extensionDir = path.join(projectRoot, 'extension');
const distDir = path.join(projectRoot, 'dist');

console.log('🚀 ChatLead Pro - Extension Builder\n');

// Criar estrutura de diretórios
console.log('📁 Criando estrutura de diretórios...');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const tempExtDir = path.join(distDir, 'extension');
if (fs.existsSync(tempExtDir)) {
  fs.rmSync(tempExtDir, { recursive: true });
}
fs.mkdirSync(tempExtDir, { recursive: true });
fs.mkdirSync(path.join(tempExtDir, 'icons'), { recursive: true });

// Arquivos a copiar
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'content.js',
  'background.js',
];

console.log('📋 Copiando arquivos...');
filesToCopy.forEach(file => {
  const src = path.join(extensionDir, file);
  const dest = path.join(tempExtDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${file}`);
  } else {
    console.warn(`  ⚠ ${file} não encontrado`);
  }
});

// Copiar ícones
console.log('🎨 Copiando ícones...');
const iconsDir = path.join(extensionDir, 'icons');
if (fs.existsSync(iconsDir)) {
  const icons = fs.readdirSync(iconsDir);
  icons.forEach(icon => {
    const src = path.join(iconsDir, icon);
    const dest = path.join(tempExtDir, 'icons', icon);
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${icon}`);
  });
}

// Criar ZIP usando archiver
console.log('\n📦 Criando arquivo ZIP...');
const zipPath = path.join(distDir, 'chatleadpro-extension.zip');

// Remover ZIP anterior se existir
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`✓ ZIP criado: ${zipPath}`);
  console.log(`  Tamanho: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  
  // Informações finais
  console.log('\n✅ Extensão construída com sucesso!\n');
  console.log('📍 Localização:');
  console.log(`   Pasta: ${tempExtDir}`);
  console.log(`   ZIP: ${zipPath}`);
  console.log('\n🚀 Próximos passos:');
  console.log('   1. Testar localmente: chrome://extensions/');
  console.log('   2. Publicar no Chrome Web Store');
  console.log(`   3. Upload do ZIP: ${zipPath}\n`);

  // Estatísticas
  console.log('📊 Estatísticas:');
  const manifestPath = path.join(tempExtDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log(`   Nome: ${manifest.name}`);
    console.log(`   Versão: ${manifest.version}`);
    console.log(`   Descrição: ${manifest.description || '-'}`);
  } else {
    console.log('   ⚠ manifest.json não encontrado na pasta de build');
  }

  const files = fs.readdirSync(tempExtDir);
  console.log(`   Arquivos: ${files.length}`);

  let totalSize = 0;
  const walkDir = (dir) => {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        totalSize += stat.size;
      }
    });
  };
  walkDir(tempExtDir);
  console.log(`   Tamanho total: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
});

archive.on('error', (err) => {
  console.error('Erro ao criar ZIP:', err.message);
  process.exit(1);
});

output.on('error', (err) => {
  console.error('Erro ao escrever ZIP:', err.message);
  process.exit(1);
});

archive.pipe(output);
archive.directory(tempExtDir, 'extension');
archive.finalize();

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Suporta execução de qualquer cwd: prioriza cwd (npm run) e fallback para pasta do script
const projectRoot = process.cwd() || path.resolve(__dirname, '..');
const extensionDir = path.join(projectRoot, 'extension');
const manifestPath = path.join(extensionDir, 'manifest.json');

console.log('🔍 Validando Manifest.json da Extensão Chrome\n');
console.log('📂 Procurando em:', manifestPath);

// Ler manifest.json
if (!fs.existsSync(extensionDir)) {
  console.error('❌ Erro: pasta "extension" não encontrada em', projectRoot);
  process.exit(1);
}
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Erro: manifest.json não encontrado em', extensionDir);
  process.exit(1);
}

let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let hasErrors = false;

// Validações e correções
console.log('📋 Verificando configurações:\n');

// 1. Verificar manifest_version
if (manifest.manifest_version !== 3) {
  console.warn('⚠️  manifest_version não é 3');
  manifest.manifest_version = 3;
  hasErrors = true;
}

// 2. Remover permissões inválidas para Manifest V3
const invalidPermissions = ['webRequest', 'webRequestBlocking'];
const originalPermissions = [...(manifest.permissions || [])];
manifest.permissions = (manifest.permissions || []).filter(p => !invalidPermissions.includes(p));

if (manifest.permissions.length < originalPermissions.length) {
  console.warn(`⚠️  Removidas permissões inválidas: ${invalidPermissions.filter(p => originalPermissions.includes(p)).join(', ')}`);
  hasErrors = true;
}

// 3. Adicionar permissões necessárias
const requiredPermissions = ['storage', 'activeTab', 'scripting', 'tabs', 'notifications'];
requiredPermissions.forEach(perm => {
  if (!manifest.permissions.includes(perm)) {
    manifest.permissions.push(perm);
    console.log(`✓ Adicionada permissão: ${perm}`);
  }
});

// 4. Validar host_permissions
if (!manifest.host_permissions) {
  manifest.host_permissions = [];
}

const requiredHosts = ['https://web.whatsapp.com/*', 'wss://*', 'https://*'];
requiredHosts.forEach(host => {
  if (!manifest.host_permissions.includes(host)) {
    manifest.host_permissions.push(host);
    console.log(`✓ Adicionado host_permission: ${host}`);
  }
});

// 5. Validar action
if (!manifest.action) {
  manifest.action = {};
  console.log('✓ Criada seção action');
}

if (!manifest.action.default_popup) {
  manifest.action.default_popup = 'popup.html';
  console.log('✓ Definido default_popup');
}

if (!manifest.action.default_title) {
  manifest.action.default_title = 'ChatLead Pro';
  console.log('✓ Definido default_title');
}

// 6. Remover default_icon de action (não necessário)
if (manifest.action.default_icon) {
  delete manifest.action.default_icon;
  console.log('✓ Removido default_icon de action');
}

// 7. Validar icons
if (!manifest.icons) {
  manifest.icons = {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  };
  console.log('✓ Adicionados ícones');
}

// 8. Validar background
if (!manifest.background) {
  manifest.background = {
    "service_worker": "background.js"
  };
  console.log('✓ Adicionado background service worker');
}

// 9. Validar content_scripts
if (!manifest.content_scripts) {
  manifest.content_scripts = [{
    "matches": ["https://web.whatsapp.com/*"],
    "js": ["content.js"],
    "run_at": "document_end"
  }];
  console.log('✓ Adicionado content script');
}

// 10. Remover web_accessible_resources se vazio
if (manifest.web_accessible_resources && 
    Array.isArray(manifest.web_accessible_resources) && 
    manifest.web_accessible_resources.length === 0) {
  delete manifest.web_accessible_resources;
  console.log('✓ Removido web_accessible_resources vazio');
}

// 11. Validar commands
if (!manifest.commands) {
  manifest.commands = {
    "capture-conversation": {
      "suggested_key": {
        "default": "Ctrl+Shift+L",
        "mac": "Command+Shift+L"
      },
      "description": "Capture current WhatsApp conversation"
    }
  };
  console.log('✓ Adicionados commands');
}

// Salvar manifest corrigido
if (hasErrors || JSON.stringify(manifest) !== JSON.stringify(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')))) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('\n✅ Manifest.json corrigido e salvo!\n');
} else {
  console.log('\n✅ Manifest.json está válido!\n');
}

// Verificar arquivos necessários
console.log('📁 Verificando arquivos necessários:\n');

const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'content.js',
  'background.js'
];

const requiredIcons = [
  'icons/icon-16.png',
  'icons/icon-48.png',
  'icons/icon-128.png'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(extensionDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.error(`✗ ${file} NÃO ENCONTRADO`);
    allFilesExist = false;
  }
});

console.log('');

requiredIcons.forEach(icon => {
  const iconPath = path.join(extensionDir, icon);
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    console.log(`✓ ${icon} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.error(`✗ ${icon} NÃO ENCONTRADO`);
    allFilesExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('✅ Extensão pronta para carregar no Chrome!\n');
  console.log('📍 Caminho: ' + extensionDir);
  console.log('\n🚀 Próximos passos:');
  console.log('   1. Abra chrome://extensions/');
  console.log('   2. Ative "Modo de desenvolvedor"');
  console.log('   3. Clique em "Carregar extensão sem empacotamento"');
  console.log('   4. Selecione a pasta: ' + extensionDir);
} else {
  console.log('❌ Alguns arquivos estão faltando!\n');
  process.exit(1);
}

console.log('');

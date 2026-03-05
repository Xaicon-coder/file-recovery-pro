// scripts/build.js — compila UI + crea installer
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const W   = process.platform === 'win32';
const bin = n => `"${path.join(root, 'node_modules/.bin', n + (W ? '.cmd' : ''))}"`;

console.log('\n[1/2] Build UI con Vite...');
execSync(`${bin('vite')} build`, { cwd: root, stdio: 'inherit' });

console.log('\n[2/2] Build installer con electron-builder...');
execSync(`${bin('electron-builder')} --win --publish never`, { cwd: root, stdio: 'inherit' });

console.log('\nFatto! Installer in ./release/');

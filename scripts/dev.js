// scripts/dev.js — avvia Vite + Electron in sviluppo
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const W   = process.platform === 'win32';
const bin = n => path.join(root, 'node_modules/.bin', n + (W ? '.cmd' : ''));

const vite = spawn(bin('vite'), [], { cwd: root, stdio: 'inherit', shell: W });

const waiter = spawn(bin('wait-on'), ['http://localhost:5173'], { cwd: root, shell: W });
waiter.on('close', () => {
  const el = spawn(bin('electron'), ['.'], {
    cwd: root, stdio: 'inherit', shell: W,
    env: { ...process.env, NODE_ENV: 'development', VITE_DEV_URL: 'http://localhost:5173' },
  });
  el.on('close', () => { vite.kill(); process.exit(0); });
});

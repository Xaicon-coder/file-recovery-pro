'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch, fn) => { const h=(_,d)=>fn(d); ipcRenderer.on(ch,h); return ()=>ipcRenderer.removeListener(ch,h); };
contextBridge.exposeInMainWorld('api', {
  win:   { min:()=>ipcRenderer.invoke('win:min'), max:()=>ipcRenderer.invoke('win:max'), close:()=>ipcRenderer.invoke('win:close') },
  sys:   { info:    () => ipcRenderer.invoke('sys:info')    },
  drive: { list:    () => ipcRenderer.invoke('drive:list')  },
  scan: {
    start:   opts => ipcRenderer.invoke('scan:start', opts),
    stop:    ()   => ipcRenderer.invoke('scan:stop'),
    onEvent: fn   => on('scan:event', fn),
  },
  recover: {
    files:   p  => ipcRenderer.invoke('recover:files', p),
    pickDir: () => ipcRenderer.invoke('recover:pickdir'),
    onTick:  fn => on('recover:tick', fn),
    onDone:  fn => on('recover:done', fn),
    open:    p  => ipcRenderer.invoke('shell:open', p),
    openDir: p  => ipcRenderer.invoke('shell:opendir', p),
  },
  updater: {
    install: ()  => ipcRenderer.invoke('updater:install'),
    check:   ()  => ipcRenderer.invoke('updater:check'),
    onEvent: fn  => on('updater', fn),
  },
});

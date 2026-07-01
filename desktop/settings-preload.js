const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('settingsApi', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (config) => ipcRenderer.invoke('settings:save', config),
})

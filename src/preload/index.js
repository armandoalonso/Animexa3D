const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openModelDialog: () => ipcRenderer.invoke('dialog:openModel'),
  chooseExportFolder: () => ipcRenderer.invoke('dialog:chooseExportFolder'),
  saveFrame: (folderPath, filename, dataURL) => 
    ipcRenderer.invoke('file:saveFrame', folderPath, filename, dataURL),
  
  // Bone mapping operations
  saveBoneMapping: (name, mappingData) => 
    ipcRenderer.invoke('file:saveBoneMapping', name, mappingData),
  loadBoneMapping: (name) => 
    ipcRenderer.invoke('file:loadBoneMapping', name),
  listBoneMappings: () => 
    ipcRenderer.invoke('file:listBoneMappings'),
  
  // Notifications
  showNotification: (title, body) => 
    ipcRenderer.invoke('notification:show', title, body)
});

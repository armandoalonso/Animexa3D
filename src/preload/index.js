const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openModelDialog: () => ipcRenderer.invoke('dialog:openModel'),
  chooseExportFolder: () => ipcRenderer.invoke('dialog:chooseExportFolder'),
  saveFrame: (folderPath, filename, dataURL, subfolder) => 
    ipcRenderer.invoke('file:saveFrame', folderPath, filename, dataURL, subfolder),
  
  // Project operations
  saveProjectDialog: () => ipcRenderer.invoke('dialog:saveProject'),
  openProjectDialog: () => ipcRenderer.invoke('dialog:openProject'),
  saveProject: (filePath, projectData, textureFiles) => 
    ipcRenderer.invoke('file:saveProject', filePath, projectData, textureFiles),
  loadProject: (filePath) => 
    ipcRenderer.invoke('file:loadProject', filePath),
  saveDroppedProject: (bufferArray, fileName) =>
    ipcRenderer.invoke('file:saveDroppedProject', bufferArray, fileName),
  readFileAsBuffer: (filePath) =>
    ipcRenderer.invoke('file:readFileAsBuffer', filePath),
  
  // Bone mapping operations
  saveBoneMapping: (name, mappingData) => 
    ipcRenderer.invoke('file:saveBoneMapping', name, mappingData),
  loadBoneMapping: (name) => 
    ipcRenderer.invoke('file:loadBoneMapping', name),
  listBoneMappings: () => 
    ipcRenderer.invoke('file:listBoneMappings'),
  
  // Texture operations
  openImageDialog: () => ipcRenderer.invoke('dialog:openImage'),
  readImageFile: (imagePath) => ipcRenderer.invoke('file:readImage', imagePath),
  saveTextureToTemp: (filename, bufferArray) => 
    ipcRenderer.invoke('file:saveTextureToTemp', filename, bufferArray),
  
  // Model export
  saveModelExport: (folderPath, filename, bufferArray, format) =>
    ipcRenderer.invoke('file:saveModelExport', folderPath, filename, bufferArray, format),
  
  // Notifications
  showNotification: (title, body) => 
    ipcRenderer.invoke('notification:show', title, body)
});

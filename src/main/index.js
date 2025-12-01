const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  // Load the index.html
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Open model file dialog
ipcMain.handle('dialog:openModel', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '3D Models', extensions: ['glb', 'gltf', 'fbx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const buffer = await fs.promises.readFile(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      data: Array.from(buffer), // Convert Buffer to array for transfer
      extension: path.extname(filePath).toLowerCase()
    };
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

// Choose directory for frame export
ipcMain.handle('dialog:chooseExportFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Save a single frame
ipcMain.handle('file:saveFrame', async (event, folderPath, filename, dataURL, subfolder = null) => {
  try {
    // Remove data URL prefix
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
    
    // Create the target directory (with subfolder if provided)
    let targetDir = folderPath;
    if (subfolder) {
      targetDir = path.join(folderPath, subfolder);
      // Create subfolder if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        await fs.promises.mkdir(targetDir, { recursive: true });
      }
    }
    
    const filePath = path.join(targetDir, filename);
    
    await fs.promises.writeFile(filePath, base64Data, 'base64');
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving frame:', error);
    return { success: false, error: error.message };
  }
});

// Save bone mapping
ipcMain.handle('file:saveBoneMapping', async (event, name, mappingData) => {
  try {
    const userDataPath = app.getPath('userData');
    const mappingsDir = path.join(userDataPath, 'bone-mappings');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(mappingsDir)) {
      await fs.promises.mkdir(mappingsDir, { recursive: true });
    }
    
    const filePath = path.join(mappingsDir, `${name}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(mappingData, null, 2));
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving bone mapping:', error);
    return { success: false, error: error.message };
  }
});

// Load bone mapping
ipcMain.handle('file:loadBoneMapping', async (event, name) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'bone-mappings', `${name}.json`);
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    console.error('Error loading bone mapping:', error);
    return { success: false, error: error.message };
  }
});

// List available bone mappings
ipcMain.handle('file:listBoneMappings', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const mappingsDir = path.join(userDataPath, 'bone-mappings');
    
    if (!fs.existsSync(mappingsDir)) {
      return { success: true, mappings: [] };
    }
    
    const files = await fs.promises.readdir(mappingsDir);
    const mappings = files
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'));
    
    return { success: true, mappings };
  } catch (error) {
    console.error('Error listing bone mappings:', error);
    return { success: false, error: error.message };
  }
});

// Show system notification
ipcMain.handle('notification:show', async (event, title, body) => {
  const { Notification } = require('electron');
  
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.show();
  }
  
  return { success: true };
});

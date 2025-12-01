const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../../icon256.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  // Maximize window on startup
  mainWindow.maximize();

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

// Open image file dialog
ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tga', 'tiff', 'tif', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Read image file as buffer
ipcMain.handle('file:readImage', async (event, imagePath) => {
  try {
    const buffer = await fs.promises.readFile(imagePath);
    return Array.from(buffer); // Convert Buffer to array for transfer
  } catch (error) {
    console.error('Error reading image file:', error);
    throw error;
  }
});

// Save texture to temp directory
ipcMain.handle('file:saveTextureToTemp', async (event, filename, bufferArray) => {
  try {
    const tempDir = app.getPath('temp');
    const texturesDir = path.join(tempDir, '3d-viewer-textures');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(texturesDir)) {
      await fs.promises.mkdir(texturesDir, { recursive: true });
    }
    
    const filePath = path.join(texturesDir, filename);
    const buffer = Buffer.from(bufferArray);
    
    await fs.promises.writeFile(filePath, buffer);
    
    return filePath;
  } catch (error) {
    console.error('Error saving texture to temp:', error);
    throw error;
  }
});

// Save project dialog
ipcMain.handle('dialog:saveProject', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    defaultPath: 'project.3dproj',
    filters: [
      { name: '3D Project Files', extensions: ['3dproj'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
});

// Open project dialog
ipcMain.handle('dialog:openProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    properties: ['openFile'],
    filters: [
      { name: '3D Project Files', extensions: ['3dproj'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Save project to file (zip-based)
ipcMain.handle('file:saveProject', async (event, filePath, projectData, textureFiles) => {
  try {
    const tempDir = path.join(app.getPath('temp'), 'animexa-project-' + Date.now());
    await fs.promises.mkdir(tempDir, { recursive: true });

    // 1. Save the model file
    if (projectData.model && projectData.model.bufferData) {
      const modelFileName = projectData.model.name;
      const modelPath = path.join(tempDir, modelFileName);
      const modelBuffer = Buffer.from(projectData.model.bufferData);
      await fs.promises.writeFile(modelPath, modelBuffer);
      
      // Update projectData to reference the file name instead of buffer
      projectData.model.fileName = modelFileName;
      delete projectData.model.bufferData;
      delete projectData.model.path;
    }

    // 2. Copy texture files to textures subfolder
    if (textureFiles && textureFiles.length > 0) {
      const texturesDir = path.join(tempDir, 'textures');
      await fs.promises.mkdir(texturesDir, { recursive: true });
      
      for (const textureFile of textureFiles) {
        if (fs.existsSync(textureFile.sourcePath)) {
          const fileName = path.basename(textureFile.sourcePath);
          const destPath = path.join(texturesDir, fileName);
          await fs.promises.copyFile(textureFile.sourcePath, destPath);
          
          // Update material texture references to use relative file names
          const material = projectData.materials.find(m => m.uuid === textureFile.materialUuid);
          if (material) {
            const texture = material.textures.find(t => t.key === textureFile.textureKey);
            if (texture) {
              texture.fileName = fileName;
              delete texture.path;
            }
          }
        }
      }
    }

    // 3. Save project.json metadata
    const projectJsonPath = path.join(tempDir, 'project.json');
    await fs.promises.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2));

    // 4. Create zip archive
    const zip = new AdmZip();
    zip.addLocalFolder(tempDir);
    zip.writeZip(filePath);

    // 5. Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving project:', error);
    return { success: false, error: error.message };
  }
});

// Load project from file (zip-based)
ipcMain.handle('file:loadProject', async (event, filePath) => {
  try {
    // 1. Extract zip to temp directory
    const tempDir = path.join(app.getPath('temp'), 'animexa-extract-' + Date.now());
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    const zip = new AdmZip(filePath);
    zip.extractAllTo(tempDir, true);

    // 2. Read project.json
    const projectJsonPath = path.join(tempDir, 'project.json');
    const projectJson = await fs.promises.readFile(projectJsonPath, 'utf8');
    const projectData = JSON.parse(projectJson);

    // Return the extracted path so renderer can load files from it
    return { 
      success: true, 
      data: projectData,
      extractedPath: tempDir
    };
  } catch (error) {
    console.error('Error loading project:', error);
    return { success: false, error: error.message };
  }
});

// Read file as buffer (for loading model from extracted project)
ipcMain.handle('file:readFileAsBuffer', async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (error) {
    console.error('Error reading file as buffer:', error);
    throw error;
  }
});

// Save dropped project file to temp location
ipcMain.handle('file:saveDroppedProject', async (event, bufferArray, fileName) => {
  try {
    const tempDir = path.join(app.getPath('temp'), 'animexa-dropped-projects');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    const tempPath = path.join(tempDir, fileName);
    const buffer = Buffer.from(bufferArray);
    await fs.promises.writeFile(tempPath, buffer);
    
    return tempPath;
  } catch (error) {
    console.error('Error saving dropped project:', error);
    throw error;
  }
});

# Quick Start Guide

## Getting Started

### 1. Install Dependencies

Open a terminal in the project directory and run:

```powershell
npm install
```

This will install:
- Electron (desktop framework)
- Three.js (3D rendering)
- Vite & electron-vite (build tools)
- Bulma (CSS framework)

### 2. Run the Application

```powershell
npm run dev
```

This starts the development server with hot-reload enabled. The application window will open automatically.

## First Steps

### Load a 3D Model

1. **Drag and Drop**: Simply drag a `.glb`, `.gltf`, or `.fbx` file onto the viewport
2. **File Dialog**: Click "Open Model" button in the top toolbar

### Play Animations

- Animations will appear in the left sidebar
- Click on any animation to play it
- Use the timeline controls at the bottom:
  - Play/Pause/Stop buttons
  - Loop checkbox
  - Timeline scrubber for precise control

### Export Animation Frames

1. Load a model with animations
2. Click "Export Frames" button
3. Configure:
   - **Resolution**: Choose HD, Full HD, 4K, or custom dimensions
   - **Frame Rate**: Select 24, 30, 60 FPS, or enter custom value
   - **Output Folder**: Choose where to save frames
4. Click "Start Export"
5. Wait for progress to complete
6. Frames will be saved as `frame_001.png`, `frame_002.png`, etc.

### Adjust Scene

**Right Sidebar Controls:**
- Background color picker
- Camera preset dropdown
- Grid visibility toggle
- Light position sliders (X, Y, Z)
- Light intensity controls

## Tips

- **Performance**: The app handles models up to several million polygons
- **Export Quality**: Higher resolutions take longer but produce better quality
- **Grid**: Grid is visible in editor but automatically hidden during export
- **Keyboard**: Use Space to play/pause, G to toggle grid, L for loop mode

## Troubleshooting

### Application won't start
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Model won't load
- Check that the file format is GLB, GLTF, or FBX
- Ensure the file isn't corrupted
- Look for error messages in DevTools (F12)

### Export fails
- Check write permissions for the output folder
- Ensure sufficient disk space
- Try a lower resolution if memory issues occur

## Next Steps

- **Phase 2**: Animation retargeting features (coming soon)
- **Custom Controls**: Modify `UIManager.js` to add your own controls
- **Scene Setup**: Edit `SceneManager.js` to change default lighting/camera
- **File Support**: Extend `ModelLoader.js` for additional formats

## Project Structure Overview

```
src/
├── main/index.js          → Electron main process, IPC handlers
├── preload/index.js       → Secure bridge between main and renderer
└── renderer/
    ├── index.html         → UI layout
    ├── renderer.js        → App initialization
    ├── styles.css         → Custom styles
    └── modules/
        ├── SceneManager.js     → Three.js scene setup
        ├── ModelLoader.js      → GLB/FBX loading
        ├── AnimationManager.js → Playback controls
        ├── ExportManager.js    → Frame export
        └── UIManager.js        → UI event handling
```

## Development Commands

```powershell
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Package as executable
npm run package

# Run production build
npm start
```

## Getting Help

- Check the README.md for detailed documentation
- Review the plan document in `docs/plan-desktop3dAnimationViewer.prompt.md`
- Inspect the code - each module is well-commented
- Open DevTools (F12) to see console messages

Happy animating! 🎬

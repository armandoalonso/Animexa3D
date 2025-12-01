# Animexa

A desktop application for viewing, playing, and exporting 3D animated models with support for animation retargeting between different rigs.

## Features

- **Model Loading**: Support for GLB, GLTF, and FBX formats
- **Animation Playback**: Play, pause, stop, and loop animations with timeline scrubbing
- **Animation Retargeting**: Transfer animations between different character rigs with robust bone mapping
- **Frame Export**: Export animations as PNG image sequences (24/30/60 FPS or custom)
- **Scene Controls**: Adjust background color, lighting, camera presets, and grid visibility
- **Drag & Drop**: Simple file loading via drag and drop
- **Keyboard Shortcuts**: Quick access to common functions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Package the application:
```bash
npm run package
```

## Usage

### Loading Models
- Click "Open Model" button or drag and drop a 3D model file (GLB, GLTF, or FBX)
- Supported formats: GLB, GLTF, FBX
- Model information will appear in the right sidebar

### Playing Animations
- Select an animation from the left sidebar
- Use playback controls at the bottom:
  - ▶️ Play
  - ⏸️ Pause
  - ⏹️ Stop
  - Loop checkbox for continuous playback
- Scrub through the timeline with the slider

### Exporting Frames
1. Load a model with animations
2. Select the animation you want to export
3. Click "Export Frames" button
4. Configure settings:
   - Resolution (HD, Full HD, 4K, or Custom)
   - Frame rate (24, 30, 60 FPS, or Custom)
   - Output folder
5. Click "Start Export"
6. Frames will be saved as `frame_001.png`, `frame_002.png`, etc.

### Scene Controls
- **Background Color**: Use color picker or hex input
- **Camera Presets**: Choose from front, back, left, right, top, bottom, or perspective views
- **Grid**: Toggle grid visibility (hidden during export)
- **Lighting**: Adjust directional and ambient light position and intensity

### Animation Retargeting
1. Load a source model with animations
2. Load a target model (different rig)
3. Open the Retarget panel
4. Click "Auto-Map Bones" for automatic bone detection
5. Review and adjust bone mappings manually if needed
6. Select animations to retarget
7. The retargeted animations will be applied to the target model

For detailed information on the retargeting algorithm, see [Retargeting Algorithm Documentation](docs/retargeting-algorithm.md).

### Keyboard Shortcuts
- `Space` - Play/Pause animation
- `L` - Toggle loop mode
- `Ctrl/Cmd + O` - Open model dialog
- `Ctrl/Cmd + E` - Open export dialog
- `G` - Toggle grid
- `1-6` - Camera presets
- `[` and `]` - Previous/Next animation

## Project Structure

```
3d-app/
├── src/
│   ├── main/                  # Electron main process
│   │   └── index.js
│   ├── preload/               # IPC bridge
│   │   └── index.js
│   └── renderer/              # UI and 3D rendering
│       ├── index.html
│       ├── renderer.js
│       ├── styles.css
│       └── modules/
│           ├── SceneManager.js
│           ├── ModelLoader.js
│           ├── AnimationManager.js
│           ├── RetargetManager.js   # NEW: Robust retargeting
│           ├── ExportManager.js
│           ├── UIManager.js
│           ├── ProjectManager.js
│           └── TextureManager.js
├── docs/
│   └── retargeting-algorithm.md    # Retargeting documentation
├── package.json
├── vite.config.js
└── README.md
```

## Development

The application uses:
- **Electron** for the desktop framework
- **Three.js** for 3D rendering
- **Vite** for building
- **Bulma** for UI styling

### Adding Features

- **Scene changes**: Edit `SceneManager.js`
- **Model loading**: Edit `ModelLoader.js`
- **Animation logic**: Edit `AnimationManager.js`
- **Export functionality**: Edit `ExportManager.js`
- **UI interactions**: Edit `UIManager.js`

## Troubleshooting

### Models not loading
- Ensure the file format is supported (GLB, GLTF, FBX)
- Check the console for error messages
- Some FBX files may require specific versions

### Export issues
- Ensure you have write permissions to the output folder
- Check available disk space
- Large resolutions may take longer to export

### Performance
- Large models (>1M polygons) may affect frame rate
- Reduce viewport size if experiencing lag
- Close other applications during export

## License

MIT

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- [Bulma](https://bulma.io/)

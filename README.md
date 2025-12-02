# Animexa3D

A powerful desktop application for viewing, managing, and exporting 3D animated models with advanced animation retargeting capabilities. Built with Electron and Three.js for professional-grade 3D animation workflows.

## ✨ Features

### Core Features
- **Multi-Format Support**: Load GLB, GLTF, and FBX 3D model files
- **Animation Playback**: Full playback controls with timeline scrubbing, looping, and frame-by-frame navigation
- **Project Management**: Save and load complete project states (.3dproj) including models, animations, textures, and scene settings
- **Drag & Drop**: Intuitive drag-and-drop support for models, animations, textures, and project files
- **Texture Management**: Load, apply, and manage multiple texture maps per material (diffuse, normal, roughness, metalness, emissive, AO)

### Advanced Features
- **Animation Retargeting**: Transfer animations between different character rigs with intelligent bone mapping
  - Automatic bone detection and mapping
  - Support for T-Pose and A-Pose normalization
  - Coordinate system conversion (Unreal Engine ↔ Three.js)
  - Position and rotation track retargeting with root motion support
- **Model Rotation Tools**: Fix coordinate system differences with manual rotation controls (X/Y/Z ±90°)
- **Origin Visualization**: Visual gizmo showing model pivot points for precise positioning
- **Camera Management**: Built-in presets (front, back, left, right, top, bottom) plus custom camera position saving
- **Frame Export**: Export animations as high-quality PNG image sequences
  - Resolutions: HD (1280×720), Full HD (1920×1080), 4K (3840×2160), or custom
  - Frame rates: 24, 30, 60 FPS, or custom
  - Alpha transparency support
- **Model Export**: Export modified models to GLB/GLTF format with baked rotations
- **Scene Customization**: Adjust background colors, lighting (directional/ambient), and grid visibility

## 🚀 Quick Start

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/armandoalonso/Animexa3D.git
cd Animexa3D
```

2. **Install dependencies**:
```bash
npm install
```

3. **Run in development mode**:
```bash
npm run dev
```

### First Use

1. **Load a Model**: Drag and drop a `.glb`, `.gltf`, or `.fbx` file onto the viewport
2. **Play Animation**: Select an animation from the left sidebar and click Play
3. **Adjust View**: Use camera presets and lighting controls in the right sidebar
4. **Save Project**: Click "Save Project" to preserve your work with all settings

## 📖 Usage Guide

### Loading Models
- **Drag & Drop**: Drop 3D model files directly onto the viewport
- **File Dialog**: Click "Open Model" button in the toolbar
- **Project Files**: Load saved `.3dproj` files to restore complete sessions
- Supported formats: GLB, GLTF, FBX

### Playing Animations
- **Animation List**: Left sidebar displays all available animations
- **Playback Controls** (bottom of screen):
  - ▶️ Play / ⏸️ Pause
  - ⏹️ Stop
  - 🔁 Loop toggle
  - Timeline scrubber for precise frame control
  - Time display (current / total duration)
- **Keyboard Shortcuts**:
  - `Space` - Play/Pause
  - `L` - Toggle loop
  - `[` / `]` - Previous/Next animation

### Animation Retargeting

Transfer animations from one character to another with different bone structures:

1. **Load Source Model**: Load your model with animations
2. **Open Retarget Panel**: Click "Retarget" button in toolbar
3. **Load Target Model**: 
   - Click "Choose Target Model" or drag & drop into the retarget panel
   - The target model will be loaded with its own skeleton
4. **Bone Mapping**:
   - Click "Auto-Map Bones" for automatic detection (works with common naming conventions)
   - Review the mapping table showing Source Bone → Target Bone pairs
   - Manually adjust mappings using the dropdown menus if needed
   - Unmapped bones can be ignored or manually assigned
5. **Pose Normalization**:
   - Select rest pose: T-Pose, A-Pose, or None
   - Enable "UE5 Rotation Fix" if source model is from Unreal Engine
6. **Retarget Animations**:
   - Select which animations to transfer
   - Click "Retarget Selected"
   - Retargeted animations will be added to the target model
7. **Apply**: Click "Apply Retargeting" to replace the source model with the retargeted result

**Advanced Options**:
- **Coordinate System Correction**: Handles different coordinate systems (Unreal Engine X-forward → Three.js Z-forward)
- **Root Motion**: Automatically preserves position tracks for root bones
- **Pose Normalization**: Applies T-pose or A-pose transformations to ensure proper alignment

### Model Rotation Tools

Fix coordinate system differences with manual rotation controls:

1. **Rotation Buttons** (right sidebar):
   - X/Y/Z +90° and -90° rotation buttons
   - "Reset Rotation" button to restore original orientation
   - "Reset Position" button to move model to world origin (0, 0, 0)
2. **Origin Gizmo**: Visual axes (Red=X, Green=Y, Blue=Z) show the model's pivot point
3. **Persistence**: Rotations are saved in project files and baked into exported models

### Project Management

Save and restore complete project states:

- **Save Project** (`.3dproj`):
  - Model data and transformations (position, rotation)
  - All animations (original + retargeted + imported)
  - Applied textures and materials
  - Camera position and settings
  - Scene settings (background, lighting, grid)
- **Load Project**: Drag & drop `.3dproj` files or use "Open Project" menu
- **Auto-Save**: Projects preserve your work for easy resumption

### Texture Management

Apply and manage textures for materials:

1. **Material List**: Right sidebar shows all materials in the loaded model
2. **Texture Slots**: Each material supports:
   - Diffuse/Base Color Map
   - Normal Map
   - Roughness Map
   - Metalness Map
   - Emissive Map
   - Ambient Occlusion (AO) Map
3. **Loading Textures**:
   - Click texture slot buttons to select image files
   - Drag & drop images onto specific slots
   - Supports: PNG, JPG, JPEG
4. **Persistence**: Texture assignments are saved in project files
### Frame Export

Export animations as PNG image sequences:

1. Load a model with animations
2. Click "Export Frames" button in toolbar
3. **Configure Settings**:
   - **Resolution**: 
     - Presets: HD (1280×720), Full HD (1920×1080), 4K (3840×2160)
     - Custom: Enter specific width and height
   - **Frame Rate**: 24, 30, 60 FPS, or custom value
   - **Transparent Background**: Enable alpha channel for compositing
   - **Output Folder**: Choose destination directory
4. Click "Start Export"
5. **Progress**: Real-time progress bar shows export status
6. **Output**: Frames saved as `frame_001.png`, `frame_002.png`, etc.

**Tips**:
- Higher resolutions take longer but produce better quality
- Grid is automatically hidden during export
- Camera position is locked during export

### Model Export

Export modified models to GLB/GLTF format:

1. Load and modify a model (rotations, textures, retargeted animations)
2. Click "Export Model" button
3. Choose format: GLB (binary) or GLTF (JSON + bin)
4. Select output location
5. Exported model includes:
   - Geometry with baked rotations
   - Applied textures
   - All animations (original + retargeted)

### Camera Controls

- **Presets**: Quick camera angles (Front, Back, Left, Right, Top, Bottom, Perspective)
- **Custom Presets**: Save current camera position/target for reuse
- **Orbit Controls**: 
  - Left-click + drag: Rotate around model
  - Right-click + drag: Pan
  - Scroll: Zoom in/out
- **Frame Model**: Automatically adjusts camera to fit model in view

### Scene Controls

**Right Sidebar**:
- **Background Color**: Color picker or hex input (#RRGGBB)
- **Grid**: Toggle visibility (useful for reference)
- **Lighting**:
  - Directional Light: Position (X, Y, Z) and intensity sliders
  - Ambient Light: Intensity slider
  - Real-time preview of lighting changes

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause animation |
| `L` | Toggle loop mode |
| `G` | Toggle grid visibility |
| `[` | Previous animation |
| `]` | Next animation |
| `Ctrl/Cmd + O` | Open model dialog |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + E` | Export frames dialog |
| `1-7` | Camera presets (1=Perspective, 2=Front, 3=Back, 4=Left, 5=Right, 6=Top, 7=Bottom) |
| `F12` | Open DevTools (development) |

## 🏗️ Project Structure

```
Animexa3D/
├── src/
│   ├── main/                      # Electron Main Process
│   │   └── index.js              # IPC handlers, file system operations, window management
│   ├── preload/                   # Security Bridge
│   │   └── index.js              # Context isolation, IPC API exposure
│   └── renderer/                  # UI & Rendering
│       ├── index.html            # Application layout and UI structure
│       ├── renderer.js           # App initialization, module orchestration
│       ├── styles.css            # Custom styling
│       └── modules/
│           ├── AnimationManager.js      # Playback controls, timeline, clip management
│           ├── CameraPresetManager.js   # Camera positioning and preset management
│           ├── ExportManager.js         # Frame/model export functionality
│           ├── ModelLoader.js           # GLB/GLTF/FBX loading and parsing
│           ├── ProjectManager.js        # Save/load project files (.3dproj)
│           ├── RetargetManager.js       # Animation retargeting algorithm
│           ├── SceneManager.js          # Three.js scene setup and rendering
│           ├── TextureManager.js        # Texture loading and material management
│           └── UIManager.js             # UI event handling and state management
├── docs/
│   ├── retargeting-algorithm.md        # Detailed retargeting documentation
│   ├── retargeting-implementation-plan.md
│   ├── retargeting-integration.md
│   └── test-models/                     # Sample models for testing
├── package.json
├── vite.config.js
└── README.md
```

### Module Overview

| Module | Responsibility |
|--------|---------------|
| **SceneManager** | Three.js scene initialization, lighting, camera, grid, model positioning, origin gizmo |
| **ModelLoader** | Loading 3D files (GLB/GLTF/FBX), polygon/bone counting, buffer management |
| **AnimationManager** | Animation playback, timeline control, clip management, loop mode |
| **RetargetManager** | Bone mapping, pose normalization, animation transfer between rigs |
| **ProjectManager** | Serialize/deserialize project state, zip/unzip .3dproj files |
| **TextureManager** | Material discovery, texture slot management, image loading |
| **ExportManager** | PNG sequence export, GLB/GLTF model export with baked transforms |
| **CameraPresetManager** | Predefined and custom camera positions, viewport framing |
| **UIManager** | Event routing, modal management, notifications, keyboard shortcuts |

## 🛠️ Development

### Tech Stack

- **Electron 28.0** - Cross-platform desktop framework
- **Three.js 0.160** - 3D rendering engine
- **Vite 5.0** - Fast build tool and dev server
- **Bulma 0.9.4** - CSS framework for UI styling
- **adm-zip 0.5.16** - Project file compression

### Build Commands

```bash
# Development with hot-reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Package as executable
npm run package

# Run production build
npm start
```

### Packaging

The app can be packaged for Windows, macOS, and Linux:

- **Windows**: NSIS installer + portable executable
- **macOS**: DMG with app bundle
- **Linux**: AppImage + DEB package

Configuration in `package.json` under `"build"` section.

### Adding Features

| Goal | Edit These Files |
|------|-----------------|
| New 3D rendering features | `SceneManager.js` |
| Support new file formats | `ModelLoader.js` |
| Animation behavior changes | `AnimationManager.js` |
| Export options/formats | `ExportManager.js` |
| UI interactions/modals | `UIManager.js` |
| Retargeting algorithm tweaks | `RetargetManager.js` |
| Project file format changes | `ProjectManager.js` |
| Texture handling | `TextureManager.js` |

### Architecture

The application follows a modular architecture with clear separation of concerns:

1. **Main Process** (`src/main/`): Handles file system, native dialogs, window lifecycle
2. **Preload Script** (`src/preload/`): Secure IPC bridge using context isolation
3. **Renderer Process** (`src/renderer/`): UI and 3D rendering with modular managers

**IPC Communication**:
- `openModelDialog()` - Open file picker for models
- `openProjectDialog()` / `saveProjectDialog()` - Project file operations
- `readFileAsBuffer()` - Read binary files
- `saveProject()` / `loadProject()` - Zip/unzip project data
- `exportFrames()` - Batch PNG export
- `exportModel()` - GLB/GLTF export

## 🐛 Troubleshooting

### Models not loading
- ✅ Verify file format is GLB, GLTF, or FBX
- ✅ Check console (F12) for error messages
- ✅ Some FBX files require specific versions (FBX 2020 recommended)
- ✅ Ensure file isn't corrupted (try opening in another 3D app)

### Retargeting issues
- ✅ Use "Auto-Map Bones" first, then manually adjust
- ✅ Ensure both models have similar bone structures (humanoid → humanoid)
- ✅ Check pose normalization settings (T-Pose vs A-Pose)
- ✅ Enable UE5 Rotation Fix if source model is from Unreal Engine
- ✅ Verify bone names in console logs

### Export problems
- ✅ Check write permissions for output folder
- ✅ Ensure sufficient disk space (4K exports can be large)
- ✅ Try lower resolution if memory issues occur
- ✅ Close other applications during export
- ✅ Check console for detailed error messages

### Performance issues
- ✅ Models >1M polygons may affect frame rate
- ✅ Reduce viewport size if experiencing lag
- ✅ Disable animations when not needed
- ✅ Close DevTools (F12) for better performance
- ✅ Restart app if memory usage grows over time

### Project files won't load
- ✅ Ensure file extension is `.3dproj`
- ✅ Check that original model/texture files are accessible
- ✅ Try re-saving the project
- ✅ Check console for missing file errors

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional file format support (OBJ, STL, etc.)
- IK (Inverse Kinematics) support
- Physics simulation
- Video export (MP4/WebM)
- Batch processing
- Python scripting API
- Plugin system

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built with:
- [Electron](https://www.electronjs.org/) - Desktop framework
- [Three.js](https://threejs.org/) - 3D rendering engine
- [Vite](https://vitejs.dev/) - Build tool
- [Bulma](https://bulma.io/) - CSS framework
- [ADM-ZIP](https://github.com/cthackers/adm-zip) - Zip file handling

## 📧 Support

For issues, questions, or feature requests, please open an issue on GitHub:
https://github.com/armandoalonso/Animexa3D/issues

---

**Made with ❤️ for 3D animation workflows**


# Desktop 3D Animation Viewer - Complete Implementation Plan

**TL;DR:** Build an Electron desktop app using Three.js for 3D rendering that loads GLB/GLTF/FBX models, plays skeletal animations with timeline control, supports animation retargeting between rigs with intelligent bone mapping, and exports animation frames as PNG sequences. Use Vite for building, vanilla JavaScript with Bulma CSS for UI, IPC for file operations, and offscreen rendering for non-blocking exports.

---

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Project Structure
- Create project directory `3d-app/`
- Run `npm init -y` to create `package.json`
- Install core dependencies:
  - `npm install electron three`
  - `npm install -D vite electron-vite`
  - `npm install bulma` (CSS framework)
- Create folder structure:
  ```
  src/
  ├── main/index.js          (Electron main process)
  ├── preload/index.js       (IPC bridge)
  └── renderer/
      ├── index.html         (UI layout)
      ├── renderer.js        (Three.js + app logic)
      ├── styles.css         (custom styles)
      └── modules/
          ├── SceneManager.js     (Three.js scene setup)
          ├── ModelLoader.js      (GLB/FBX loading)
          ├── AnimationManager.js (playback/timeline)
          ├── RetargetManager.js  (bone mapping)
          ├── ExportManager.js    (frame export)
          └── UIManager.js        (DOM manipulation)
  ```

### 1.2 Configure Build System
- Create `vite.config.js` for electron-vite:
  ```javascript
  import { defineConfig } from 'vite'
  
  export default defineConfig({
    main: {
      build: { outDir: 'dist-electron/main' }
    },
    preload: {
      build: { outDir: 'dist-electron/preload' }
    },
    renderer: {
      base: './',
      build: { outDir: 'dist' }
    }
  })
  ```
- Add scripts to `package.json`:
  - `"dev": "electron-vite dev"`
  - `"build": "electron-vite build"`
  - `"start": "electron ."`

### 1.3 Setup Electron Main Process
- Create `src/main/index.js`:
  - Initialize Electron app lifecycle (`app.whenReady()`)
  - Create `BrowserWindow` with dimensions 1280x800
  - Set `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, preload script path
  - Load `index.html` from renderer
  - Handle window resize events
  - Implement app quit behavior (macOS vs Windows/Linux)

### 1.4 Setup Secure IPC Bridge
- Create `src/preload/index.js` with `contextBridge.exposeInMainWorld()`:
  - `openModelDialog()` - open file dialog for GLB/GLTF/FBX
  - `saveFrameDialog()` - choose directory for frame export
  - `saveFrame(index, dataURL)` - save single PNG frame
  - `saveBoneMapping(name, mapping)` - persist bone map JSON
  - `loadBoneMapping(name)` - retrieve saved bone map
  - `showNotification(title, body, type)` - display toast/system notification
  - `readFile(path)` - read file as ArrayBuffer
- In `src/main/index.js`, implement `ipcMain.handle()` for each API:
  - Use `dialog.showOpenDialog()` with filters `['glb', 'gltf', 'fbx']`
  - Use `dialog.showOpenDialog({ properties: ['openDirectory'] })` for export folder
  - Use `fs.promises.writeFile()` for saving frames (decode base64)
  - Store bone mappings in app data directory (`app.getPath('userData')`)
  - Implement notification system (both in-app and OS-level)

---

## Phase 2: UI Layout & Styling

### 2.1 Create Base HTML Structure
- Design `src/renderer/index.html`:
  - Link Bulma CSS: `<link rel="stylesheet" href="node_modules/bulma/css/bulma.min.css">`
  - Create responsive grid layout:
    - Top toolbar (file operations, export)
    - Left sidebar (animation list, 300px width)
    - Center viewport (`<canvas id="webgl-canvas">`)
    - Right sidebar (scene controls, 300px width)
    - Bottom timeline panel (playback controls, scrubber)
  - Add elements:
    - Drop zone overlay for drag-and-drop
    - Modal for bone mapping UI
    - Modal for export settings
    - Toast notification container

### 2.2 Implement Responsive Layout
- Use Bulma columns system with flexbox
- Add CSS in `src/renderer/styles.css`:
  - Canvas fills available space (`flex-grow: 1`)
  - Sidebars have `overflow-y: auto` for scrollable content
  - On window resize, update Three.js renderer size
- Add window resize listener in renderer.js:
  ```javascript
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });
  ```

### 2.3 Style UI Components
- Top Toolbar:
  - "Open Model" button (primary)
  - "Export Frames" button (success)
  - "Retarget Animation" button (info)
- Left Sidebar (Animation List):
  - Scrollable list of animation buttons
  - Each animation shows name + duration
  - Active animation highlighted
- Right Sidebar (Scene Controls):
  - Background Color picker (hex input or native color picker)
  - Lighting controls (directional light position X/Y/Z sliders, intensity)
  - Grid toggle checkbox (on by default)
  - Camera presets dropdown (Front, Back, Left, Right, Top, Bottom, Perspective)
- Timeline Panel:
  - Play/Pause button (toggle icon)
  - Loop toggle checkbox
  - Time scrubber (`<input type="range">`)
  - Current time display (MM:SS:FF format)
  - Total duration display

### 2.4 Drag-and-Drop Overlay
- Create fullscreen drop zone overlay (initially hidden)
- Show on `dragover` event over window
- Style with semi-transparent background, dashed border
- Display "Drop 3D Model Here" text
- Hide on `dragleave` or `drop`

---

## Phase 3: Three.js Scene Setup

### 3.1 Create SceneManager Module
- In `src/renderer/modules/SceneManager.js`, export class:
  - `constructor()`: Initialize Three.js core objects
  - Create `THREE.Scene()`
  - Create `THREE.PerspectiveCamera(45, aspect, 0.1, 1000)`
  - Create `THREE.WebGLRenderer()` with options:
    - `canvas: document.getElementById('webgl-canvas')`
    - `antialias: true`
    - `preserveDrawingBuffer: true` (for frame capture)
  - Set initial camera position `(0, 1.6, 3)`
  - Set background color (default: `0x2c3e50`)

### 3.2 Add Lighting System
- Add ambient light: `THREE.AmbientLight(0xffffff, 0.4)`
- Add directional light: `THREE.DirectionalLight(0xffffff, 0.8)`
  - Default position: `(5, 10, 7.5)`
  - Enable shadows (optional enhancement)
- Store light references for UI control
- Method `updateLightPosition(x, y, z)` to adjust light
- Method `updateLightIntensity(value)` to adjust brightness

### 3.3 Add Grid Helper
- Create `THREE.GridHelper(20, 20, 0x888888, 0x444444)`
- Add to scene
- Store reference as `this.grid`
- Method `toggleGrid(visible)` to show/hide
- **Important**: Track grid visibility, remove before export

### 3.4 Setup Orbit Controls
- Import `OrbitControls` from `'three/examples/jsm/controls/OrbitControls.js'`
- Create controls: `new OrbitControls(camera, renderer.domElement)`
- Enable damping: `controls.enableDamping = true`
- Set damping factor: `controls.dampingFactor = 0.05`

### 3.5 Implement Render Loop
- Create animation loop:
  ```javascript
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    if (this.mixer) this.mixer.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  }
  ```
- Start loop on initialization

### 3.6 Camera Preset System
- Store default camera positions/targets for presets:
  - Front: `(0, 1.6, 3)` looking at `(0, 1.6, 0)`
  - Back: `(0, 1.6, -3)` looking at `(0, 1.6, 0)`
  - Left: `(-3, 1.6, 0)` looking at `(0, 1.6, 0)`
  - Right: `(3, 1.6, 0)` looking at `(0, 1.6, 0)`
  - Top: `(0, 5, 0)` looking at `(0, 0, 0)`
  - Bottom: `(0, -5, 0)` looking at `(0, 0, 0)`
- Method `applyCameraPreset(presetName)` to transition camera
- Animate transition smoothly (optional: use GSAP or tween)

---

## Phase 4: 3D Model Loading

### 4.1 Create ModelLoader Module
- In `src/renderer/modules/ModelLoader.js`:
  - Import `GLTFLoader` from `'three/examples/jsm/loaders/GLTFLoader.js'`
  - Import `FBXLoader` from `'three/examples/jsm/loaders/FBXLoader.js'`
  - Create singleton loaders in constructor

### 4.2 Implement File Dialog Loading
- In `UIManager.js`, attach click handler to "Open Model" button
- Call `window.electronAPI.openModelDialog()`
- Receive file path and ArrayBuffer
- Determine file type from extension
- Pass to `ModelLoader.loadFromBuffer(buffer, extension, scene)`

### 4.3 Implement Drag-and-Drop Loading
- Add event listeners in `renderer.js`:
  - Prevent default `dragover` and `drop` on document
  - On `dragover`: Show drop zone overlay
  - On `drop`: 
    - Get first file from `event.dataTransfer.files`
    - Validate extension (glb, gltf, fbx)
    - Read file with `FileReader.readAsArrayBuffer()`
    - Pass buffer to `ModelLoader.loadFromBuffer()`

### 4.4 GLB/GLTF Loading Logic
- Method `loadGLTF(buffer, scene)`:
  - Create `Uint8Array` from buffer
  - Use `GLTFLoader.parse(buffer, '', callback, errorCallback)`
  - In callback:
    - Clear previous model from scene (if exists)
    - Add `gltf.scene` to scene
    - Extract `gltf.animations` array
    - Center model at origin (calculate bounding box, adjust position)
    - Store reference to model and animations
    - Return `{ model: gltf.scene, animations: gltf.animations, skeletons: [] }`
  - In error callback: Show notification with error details

### 4.5 FBX Loading Logic
- Method `loadFBX(buffer, scene)`:
  - Create `Uint8Array` from buffer
  - Use `FBXLoader.parse(buffer, '')`
  - Add loaded object to scene
  - Extract animations from `object.animations` or empty array
  - Center model (same as GLTF)
  - Return `{ model: object, animations: object.animations || [], skeletons: [] }`
  - Handle errors with notifications

### 4.6 Extract Skeleton Information
- After loading model, traverse scene graph
- Find all `SkinnedMesh` objects
- For each, extract `mesh.skeleton` and `skeleton.bones`
- Build bone hierarchy map: `{ boneName: boneObject }`
- Store for retargeting system
- Method `getSkeletonInfo()` returns bone names array

### 4.7 Model Cleanup and Validation
- Validate model has geometry (not empty)
- Check for animations presence
- Display model info notification:
  - Model name
  - Polygon count (sum all geometries)
  - Animation count
  - Bone count (if rigged)
- If model invalid, show detailed error notification

---

## Phase 5: Animation System

### 5.1 Create AnimationManager Module
- In `src/renderer/modules/AnimationManager.js`:
  - Store reference to Three.js `AnimationMixer`
  - Store current `AnimationAction`
  - Store animation clips array
  - Track playback state (playing/paused)
  - Track loop mode (enabled/disabled)

### 5.2 Initialize Animation Mixer
- When model loaded, create `THREE.AnimationMixer(model)`
- Store in `AnimationManager`
- In render loop, call `mixer.update(deltaTime)`

### 5.3 Populate Animation List UI
- Method `populateAnimationList(animations)`:
  - Clear existing list in left sidebar
  - For each `AnimationClip`:
    - Create button element with clip name (or "Animation {index}" if unnamed)
    - Display duration in seconds
    - Attach click handler to play animation
    - Append to sidebar list

### 5.4 Animation Playback Control
- Method `playAnimation(clipIndex)`:
  - Stop current action if playing: `currentAction.stop()`
  - Get clip from animations array
  - Create action: `mixer.clipAction(clip)`
  - Configure loop: `action.setLoop(loopEnabled ? THREE.LoopRepeat : THREE.LoopOnce)`
  - Reset and play: `action.reset().play()`
  - Store as `currentAction`
  - Update UI (highlight selected animation button)
  - Reset timeline scrubber to 0
- Method `pauseAnimation()`: `currentAction.paused = true`
- Method `resumeAnimation()`: `currentAction.paused = false`
- Method `stopAnimation()`: `currentAction.stop()`
- Method `toggleLoop()`: Update loop mode, reapply to current action

### 5.5 Timeline Scrubber Implementation
- HTML: `<input type="range" id="time-slider" min="0" max="1" step="0.001" value="0">`
- On `input` event:
  - Get clip duration: `currentAction.getClip().duration`
  - Calculate time: `sliderValue * duration`
  - Set mixer time: `mixer.setTime(time)`
  - Pause playback while scrubbing
- On `change` event (scrub complete):
  - Resume playback if it was playing before scrub

### 5.6 Timeline Auto-Update During Playback
- In render loop, if animation playing:
  - Get current time: `currentAction.time`
  - Get duration: `currentAction.getClip().duration`
  - Update slider: `slider.value = time / duration`
  - Update time display: Convert to MM:SS:FF format (24fps base)
  - Example: `02:35:12` for 2 minutes, 35 seconds, 12 frames

### 5.7 Playback Control UI
- Play button: Calls `playAnimation()` or `resumeAnimation()`
- Pause button: Calls `pauseAnimation()`
- Stop button: Calls `stopAnimation()`, resets timeline to 0
- Loop checkbox: Calls `toggleLoop()` on change
- Display current/total time below scrubber

---

## Phase 6: Animation Retargeting System

### 6.1 Create RetargetManager Module
- In `src/renderer/modules/RetargetManager.js`:
  - Import `SkeletonUtils` from `'three/examples/jsm/utils/SkeletonUtils.js'`
  - Store source model, target model references
  - Store bone mapping object: `{ sourceBone: targetBone }`
  - Store detected rig types for both models

### 6.2 Rig Type Detection
- Method `detectRigType(boneNames)`:
  - Define bone name patterns for common rigs:
    - **Mixamo**: Contains "mixamorig:", bones like "Hips", "Spine", "LeftArm"
    - **UE5/Unreal**: Prefix "pelvis", "spine_01", "clavicle_l"
    - **Unity Humanoid**: "Hips", "Spine", "Chest", "LeftUpperArm"
    - **Generic**: Check for common bone names (case-insensitive)
  - Return detected type: `'mixamo' | 'ue5' | 'unity' | 'humanoid' | 'custom'`
  - If humanoid rig, also detect naming convention (prefix/suffix patterns)

### 6.3 Automatic Bone Mapping
- Method `generateAutomaticMapping(sourceRig, targetRig)`:
  - If both same rig type: Create 1:1 mapping by name
  - If both humanoid but different naming:
    - Define standard humanoid bone roles:
      - Root, Hips, Spine, Chest, Neck, Head
      - LeftShoulder, LeftArm, LeftForeArm, LeftHand
      - RightShoulder, RightArm, RightForeArm, RightHand
      - LeftUpLeg, LeftLeg, LeftFoot
      - RightUpLeg, RightLeg, RightFoot
    - Map each role to source/target bone names
    - Create mapping dictionary
  - Return mapping object with confidence score (0-1)
  - Flag unmapped bones for manual review

### 6.4 Bone Mapping UI Modal
- Create modal dialog in HTML:
  - Left column: Source skeleton tree (collapsible bone hierarchy)
  - Right column: Target skeleton tree
  - Mapping display area showing paired bones
  - Auto-map button (runs automatic mapping)
  - Manual mapping: Drag-and-drop or dropdown selection
  - Save mapping button (persists to file)
  - Load mapping button (from saved files)
  - Apply button (executes retargeting)
- Use Bulma modal component
- Display confidence indicators (green=high, yellow=medium, red=manual required)

### 6.5 Visual Bone Hierarchy Display
- Method `buildBoneTree(skeleton)`:
  - Traverse skeleton bone hierarchy
  - Create nested HTML structure (ul/li with indentation)
  - Each bone as draggable element with name
  - Color-code bones by mapping status (mapped/unmapped)
  - Show bone position/rotation info on hover

### 6.6 Manual Bone Mapping Interface
- Allow user to select source bone (click)
- Select target bone (click)
- Create mapping pair with button click
- Display mapping as: `SourceBone → TargetBone`
- Allow removal of individual mappings
- Validate no duplicate mappings
- Highlight mapped bones in tree view

### 6.7 Save/Load Bone Mappings
- Method `saveBoneMapping(name)`:
  - Create JSON object with mapping + metadata:
    ```json
    {
      "name": "Mixamo to UE5",
      "sourceRigType": "mixamo",
      "targetRigType": "ue5",
      "mapping": { "mixamorig:Hips": "pelvis", ... },
      "createdAt": "2025-12-01"
    }
    ```
  - Call `window.electronAPI.saveBoneMapping(name, json)`
  - Show success notification
- Method `loadBoneMapping(name)`:
  - Call `window.electronAPI.loadBoneMapping(name)`
  - Parse JSON, populate mapping in UI
  - Apply to current models

### 6.8 Execute Retargeting
- Method `retargetAnimation(sourceClip, targetModel)`:
  - Get source skeleton from source model
  - Find target SkinnedMesh in target model
  - Create retarget options object from bone mapping
  - Call `SkeletonUtils.retargetClip(targetMesh, sourceSkeleton, sourceClip, options)`
  - Return new `AnimationClip` for target
  - Add to target model's animation list
  - Create new mixer for target: `new THREE.AnimationMixer(targetMesh)`
  - Play retargeted animation
  - Show success notification with clip name

### 6.9 Multi-Animation Retargeting
- Allow selecting multiple source animations
- Batch retarget all to target model
- Show progress bar during batch operation
- Add all retargeted clips to target's animation list

---

## Phase 7: Frame Export System

### 7.1 Create ExportManager Module
- In `src/renderer/modules/ExportManager.js`:
  - Store export configuration (resolution, FPS, format)
  - Store progress state
  - Handle frame capture and save

### 7.2 Export Settings Modal
- Create modal in HTML:
  - Resolution presets dropdown:
    - 1920x1080 (Full HD)
    - 1280x720 (HD)
    - 3840x2160 (4K)
    - Custom (width/height inputs)
  - FPS selector:
    - Radio buttons or dropdown: 24, 30, 60, Custom
    - Custom FPS input (numeric, 1-120 range)
  - Frame numbering preview: `frame_001.png`
  - Output folder selection (click to choose directory)
  - Export button (starts process)
  - Cancel button
- Validate all fields before allowing export

### 7.3 Directory Selection
- On "Choose Folder" button click:
  - Call `window.electronAPI.saveFrameDialog()`
  - Receive selected directory path
  - Display path in UI
  - Enable export button

### 7.4 Calculate Export Parameters
- Method `calculateExportParams()`:
  - Get active animation clip duration (seconds)
  - Get selected FPS
  - Calculate total frame count: `Math.ceil(duration * fps)`
  - Calculate time step per frame: `1 / fps`
  - Return `{ frameCount, timeStep, duration, fps, resolution }`

### 7.5 Offscreen Rendering Setup
- Method `prepareOffscreenRender(width, height)`:
  - Store original renderer size
  - Store original camera aspect
  - Hide grid: `sceneManager.toggleGrid(false)`
  - Set renderer size to export resolution: `renderer.setSize(width, height)`
  - Update camera aspect: `camera.aspect = width / height; camera.updateProjectionMatrix()`
  - Ensure `preserveDrawingBuffer: true` is set

### 7.6 Frame Capture Loop
- Method `exportFrames(config)` (async):
  - Show progress modal with:
    - Progress bar (0-100%)
    - Current frame number / total
    - Estimated time remaining
    - Cancel button
  - Prepare offscreen render
  - Loop from frame 0 to frameCount:
    - Calculate time: `frameIndex * timeStep`
    - Set animation time: `mixer.setTime(time)`
    - Render scene: `renderer.render(scene, camera)`
    - Capture frame: `canvas.toDataURL('image/png')`
    - Generate filename: `frame_${String(frameIndex).padStart(3, '0')}.png`
    - Call `window.electronAPI.saveFrame(filename, dataURL)`
    - Update progress: `(frameIndex / frameCount) * 100`
    - Yield control with `await new Promise(resolve => setTimeout(resolve, 0))` (prevent blocking)
    - Check cancel flag, break if cancelled
  - Restore original renderer size and camera aspect
  - Show grid again
  - Hide progress modal
  - Show completion notification

### 7.7 Progress Indicator
- Create progress modal in HTML:
  - Bulma progress bar element
  - Text: "Exporting frame 42 of 120..."
  - ETA calculation based on average frame time
  - Cancel button sets flag to stop export
- Update progress every frame (or every N frames for performance)

### 7.8 Alternative: Use OffscreenCanvas
- For better performance (non-blocking UI):
  - Create `OffscreenCanvas` in Web Worker (if supported)
  - Transfer Three.js context to worker
  - Render frames in worker, post back blobs
  - Main thread saves blobs via IPC
  - **Note**: Three.js in Worker requires careful setup, may defer to Phase 2

### 7.9 Export Completion
- Show notification: "Export complete! 120 frames saved to [directory]"
- Option to open folder in file explorer (call Electron shell API)
- Reset export state

### 7.10 Error Handling During Export
- Try-catch around each frame save
- If error, pause export, show error notification
- Offer retry current frame or cancel export
- Log errors to console with frame number

---

## Phase 8: Scene Controls & Configuration

### 8.1 Background Color Control
- Add color picker in right sidebar:
  - HTML: `<input type="color" id="bg-color" value="#2c3e50">`
  - On change, convert hex to Three.js color
  - Update: `scene.background = new THREE.Color(hexValue)`
- Also provide hex text input for precise entry

### 8.2 Lighting Controls
- **Directional Light Position:**
  - Three range sliders for X, Y, Z (-20 to 20 range)
  - Display current values next to sliders
  - On input, update: `light.position.set(x, y, z)`
- **Light Intensity:**
  - Range slider (0 to 2, step 0.1)
  - Display value (e.g., "0.8")
  - On input, update: `light.intensity = value`
- **Ambient Light Intensity:**
  - Range slider (0 to 1, step 0.1)
  - On input, update: `ambientLight.intensity = value`

### 8.3 Grid Toggle
- Checkbox in right sidebar: "Show Grid"
- Default: checked
- On change: `sceneManager.toggleGrid(checked)`
- Remember to hide during export (already implemented in Phase 7)

### 8.4 Camera Presets Dropdown
- Dropdown/select element with options:
  - Front View
  - Back View
  - Left View
  - Right View
  - Top View
  - Bottom View
  - Perspective (default)
- On change, call `sceneManager.applyCameraPreset(selectedPreset)`
- Animate camera transition smoothly (optional enhancement)

### 8.5 Manual Camera Controls
- OrbitControls already allows manual adjustment
- Add reset button to return to default position
- Display current camera position (X, Y, Z) for reference

### 8.6 Scene Statistics Display
- Show in UI (bottom right corner):
  - FPS counter (using `stats.js` or manual calculation)
  - Model polygon count
  - Current animation name
  - Bone count (if rigged)
  - Memory usage (optional)

---

## Phase 9: Notification System

### 9.1 Create Notification Container
- Add fixed position div at top-right of window:
  ```html
  <div id="notification-container" class="notification-container"></div>
  ```
- Style with CSS: fixed positioning, z-index above all, stacked vertically

### 9.2 Notification Types
- Define types: `success`, `error`, `warning`, `info`
- Each type has distinct color (Bulma color classes):
  - Success: green
  - Error: red
  - Warning: yellow
  - Info: blue

### 9.3 Show Notification Method
- Method `showNotification(message, type, duration)`:
  - Create notification element:
    ```html
    <div class="notification is-${type}">
      <button class="delete"></button>
      ${message}
    </div>
    ```
  - Append to container
  - Animate in (slide from right or fade)
  - Auto-dismiss after duration (default 5 seconds)
  - Click delete button to dismiss immediately
  - Animate out when dismissed

### 9.4 System Notifications (Optional)
- For major events (export complete), also use system notifications:
  - Call `window.electronAPI.showNotification(title, body)`
  - Main process shows Electron `Notification`
- User can configure preference (in-app only vs. system)

### 9.5 Error Detail Modal
- For detailed errors (model loading failures):
  - Show notification with "Details" button
  - Click opens modal with full error stack trace
  - Scrollable text area with error details
  - Copy button to copy error to clipboard

---

## Phase 10: Polish & Enhancements

### 10.1 Loading Indicators
- Show spinner overlay during model loading:
  - Semi-transparent fullscreen overlay
  - Centered spinner animation
  - Text: "Loading model..."
- Hide when loading complete or error

### 10.2 Keyboard Shortcuts
- Implement shortcuts:
  - `Space`: Play/Pause animation
  - `L`: Toggle loop mode
  - `O`: Open model dialog
  - `E`: Open export dialog
  - `G`: Toggle grid
  - `1-6`: Camera presets
  - `[` and `]`: Previous/next animation
- Display shortcuts in help menu or tooltip

### 10.3 Empty State UI
- When no model loaded:
  - Display centered message: "Drop a 3D model here or click to browse"
  - Large drop zone area
  - Show supported formats: GLB, GLTF, FBX
- Hide controls until model loaded

### 10.4 Model Info Panel
- When model loaded, show expandable info panel:
  - Model filename
  - File size
  - Polygon/vertex count
  - Texture count (if any)
  - Animation count
  - Skeleton info (bone count, rig type)
- Collapsible section in right sidebar

### 10.5 Animation Thumbnails (Optional Enhancement)
- Generate thumbnail preview for each animation:
  - Capture frame at 50% duration
  - Render small preview (128x128)
  - Display in animation list as icon
- Helps identify animations visually

### 10.6 Recent Files List (Skipped per requirements)
- User requested no recent files tracking

### 10.7 Settings Panel (Future)
- Add settings button in toolbar
- Modal with preferences:
  - Default export resolution
  - Default FPS
  - Auto-play animations on load
  - Notification preferences
  - Camera controls sensitivity
- Save settings to localStorage or app data

---

## Phase 11: Testing & Debugging

### 11.1 Test Model Loading
- Test with various GLB/GLTF files:
  - Simple models (primitives)
  - Complex characters (Mixamo)
  - Models with multiple animations
  - Models without animations
  - Models with textures/materials
- Test with FBX files:
  - Various versions (FBX 7.x)
  - Binary and ASCII formats
  - Files with embedded textures
- Test drag-and-drop vs. file dialog
- Test invalid files, error handling

### 11.2 Test Animation System
- Test playback of all animation types:
  - Skeletal animations (humanoid, creature)
  - Morph target animations
  - Object transforms (position/rotation)
- Test play/pause/stop/loop controls
- Test timeline scrubbing (smooth, accurate)
- Test animation switching (no artifacts)
- Test edge cases (0-duration clips, empty clips)

### 11.3 Test Retargeting
- Test automatic bone mapping:
  - Mixamo to Mixamo (perfect match)
  - Mixamo to UE5 humanoid
  - Unity to UE5
  - Custom rigs (manual mapping)
- Test retargeted animation playback (correct motion)
- Test saving/loading bone mappings
- Test with mismatched skeletons (fewer bones, different hierarchy)

### 11.4 Test Export System
- Test frame export at various settings:
  - Different resolutions (720p, 1080p, 4K)
  - Different FPS (24, 30, 60, custom)
  - Short animations (<1s) and long (>30s)
- Verify frame numbering (frame_001.png, frame_002.png, ...)
- Verify PNG quality and transparency (if applicable)
- Test progress indicator accuracy
- Test cancel during export (cleanup, no orphaned files)
- Test export with grid hidden

### 11.5 Test UI Responsiveness
- Test window resize (canvas updates, layout intact)
- Test on different screen resolutions
- Test all controls (sliders, buttons, inputs)
- Test modals (open/close, overlay)
- Test notifications (display, dismiss, stack)

### 11.6 Test Performance
- Load large models (>1M polygons), measure FPS
- Play complex animations, check for stuttering
- Export long animations, monitor memory usage
- Check for memory leaks (load/unload models repeatedly)
- Test on low-end hardware (optional)

### 11.7 Error Handling Tests
- Test with corrupted model files
- Test with unsupported formats
- Test with no write permissions (export folder)
- Test network drive export (slow I/O)
- Test with insufficient disk space
- Verify all errors show notifications

### 11.8 Cross-Platform Testing
- Test on Windows (primary platform)
- Test on macOS (if available)
- Test on Linux (if available)
- Verify file dialogs work on all platforms
- Verify keyboard shortcuts work on all platforms

---

## Phase 12: Documentation

### 12.1 Code Documentation
- Add JSDoc comments to all classes and methods:
  - Parameter types and descriptions
  - Return value types
  - Usage examples for complex methods
- Document module dependencies
- Add inline comments for complex algorithms (bone mapping, retargeting)

### 12.2 User Guide
- Create `USER_GUIDE.md`:
  - Installation instructions
  - Quick start tutorial (load model, play animation, export)
  - Feature overview (all UI elements explained)
  - Keyboard shortcuts reference
  - Troubleshooting common issues
  - Supported file formats and limitations
  - Tips for best results (model preparation, bone mapping)

### 12.3 Developer Guide
- Create `DEVELOPER.md`:
  - Project structure explanation
  - Build and run instructions
  - Development workflow (npm scripts)
  - Adding new features (where to add code)
  - Three.js integration notes
  - Electron IPC architecture
  - Testing procedures

### 12.4 README.md
- Project description and features
- Screenshots of UI
- Installation and usage quick start
- Link to detailed user guide
- Credits and license
- Contribution guidelines (if open source)

---

## Phase 13: Build & Distribution

### 13.1 Production Build Configuration
- Configure electron-builder or electron-packager:
  - Create `electron-builder.yml`:
    ```yaml
    appId: com.3danimviewer.app
    productName: 3D Animation Viewer
    directories:
      output: release
    files:
      - dist/**/*
      - dist-electron/**/*
    win:
      target: nsis
      icon: build/icon.ico
    mac:
      target: dmg
      icon: build/icon.icns
    linux:
      target: AppImage
      icon: build/icon.png
    ```
- Add build script to `package.json`: `"package": "electron-builder"`

### 13.2 Application Icons
- Create app icons in multiple sizes:
  - Windows: 256x256 PNG → convert to .ico
  - macOS: 512x512 PNG → convert to .icns
  - Linux: 512x512 PNG
- Place in `build/` directory
- Use icon generation tool (electron-icon-maker) or manual

### 13.3 Installer Configuration
- Configure NSIS installer (Windows):
  - One-click install
  - Add to Start Menu
  - Desktop shortcut option
  - File associations (.glb, .gltf, .fbx) - optional
- Configure DMG (macOS):
  - Background image
  - Application + Applications folder shortcut
- Configure AppImage (Linux):
  - Desktop entry with icon
  - MIME type associations

### 13.4 Code Signing (Optional)
- For production releases, sign executables:
  - Windows: Code signing certificate
  - macOS: Apple Developer certificate
  - Prevents security warnings on install

### 13.5 Build Process
- Run production build: `npm run build`
- Run packaging: `npm run package`
- Test installer on clean machine
- Verify all features work in packaged app
- Check file sizes (optimize if needed)

### 13.6 Release Checklist
- Version bump in `package.json`
- Update CHANGELOG.md with new features/fixes
- Create Git tag for version
- Build for all target platforms
- Test installers
- Upload to distribution platform (GitHub Releases, website, etc.)
- Announce release

---

## Phase 14: Optional Future Enhancements

### 14.1 Video Export
- Add option to export animation as MP4/WebM video
- Use FFmpeg integration via Electron
- Render frames to temp directory, then encode video
- Configurable bitrate and codec

### 14.2 Bone Visualization
- Toggle to show skeleton in viewport
- Render bones as lines connecting joints
- Highlight selected bones during retargeting
- Display bone names as labels (on hover)

### 14.3 Material/Texture Editing
- Basic material editor (color, metalness, roughness)
- Texture swapping (load external images)
- Environment maps for reflections
- PBR material preview

### 14.4 Animation Blending
- Crossfade between two animations
- Weight slider to control blend amount
- Create new blended animation clip
- Useful for transitions

### 14.5 Pose Library
- Save individual poses from animation frames
- Store in library with thumbnails
- Load pose onto model (set bone transforms)
- Useful for manual animation editing

### 14.6 IK (Inverse Kinematics)
- Add IK constraints for limbs
- Drag end effector (hand/foot) to position
- Solve bone chain automatically
- Enhance retargeting accuracy

### 14.7 Custom Animation Creation
- Keyframe editor (timeline with keys)
- Record bone transforms at keyframes
- Interpolation between keys (linear, bezier)
- Export as new animation clip

### 14.8 Batch Processing
- Load multiple models
- Apply same animation to all
- Export all in one operation
- Progress tracking for batch

### 14.9 Cloud Synchronization
- Sync bone mappings across devices
- Share mappings with team
- Cloud storage for project files
- Requires backend service

### 14.10 Plugin System
- Allow third-party plugins
- Custom loaders for other formats (OBJ, Collada)
- Custom export formats
- Custom retargeting algorithms

---

## Implementation Priority Order

**Must-Have (MVP):**
1. Phase 1: Project Setup (all tasks)
2. Phase 2: UI Layout (tasks 2.1-2.3)
3. Phase 3: Three.js Scene (tasks 3.1-3.5)
4. Phase 4: Model Loading (all tasks)
5. Phase 5: Animation System (all tasks)
6. Phase 7: Frame Export (tasks 7.1-7.9)
7. Phase 8: Scene Controls (tasks 8.1-8.3)
8. Phase 9: Notification System (tasks 9.1-9.3)

**Should-Have (V1.0):**
9. Phase 6: Animation Retargeting (all tasks)
10. Phase 2: UI Layout (task 2.4 - drag-drop overlay)
11. Phase 8: Scene Controls (tasks 8.4-8.6)
12. Phase 9: Notification System (tasks 9.4-9.5)
13. Phase 10: Polish (tasks 10.1-10.4)

**Nice-to-Have (V1.1+):**
14. Phase 10: Polish (tasks 10.5-10.7)
15. Phase 11: Testing (comprehensive)
16. Phase 12: Documentation
17. Phase 13: Build & Distribution

**Future Versions:**
18. Phase 14: Optional Enhancements (as needed)

---

## Estimated Timeline

- **Phase 1-3** (Foundation): 3-5 days
- **Phase 4** (Model Loading): 2-3 days
- **Phase 5** (Animation): 2-3 days
- **Phase 7** (Export): 3-4 days
- **Phase 8** (Scene Controls): 1-2 days
- **Phase 9** (Notifications): 1 day
- **Phase 6** (Retargeting): 5-7 days
- **Phase 10** (Polish): 2-3 days
- **Phase 11** (Testing): 3-5 days
- **Phase 12** (Documentation): 2-3 days
- **Phase 13** (Build): 1-2 days

**Total MVP (Phases 1-5, 7-9):** ~15-20 days
**Total V1.0 (+ Phase 6, 10):** ~25-35 days
**Total V1.1 (+ Phase 11-13):** ~30-45 days

---

## Success Criteria

The application will be considered complete when:

1. ✅ User can load GLB/GLTF/FBX models via dialog or drag-drop
2. ✅ All embedded animations are listed and playable
3. ✅ Timeline scrubber allows frame-by-frame control
4. ✅ Play/pause/loop controls work correctly
5. ✅ User can export animation as PNG sequence with custom FPS
6. ✅ Export uses padded frame numbering (frame_001.png)
7. ✅ Progress indicator shows during export
8. ✅ Grid is visible in viewport but excluded from export
9. ✅ Background color is configurable
10. ✅ Directional light position and intensity are adjustable
11. ✅ Camera presets available (Front, Top, etc.)
12. ✅ Animation retargeting works between common rig types
13. ✅ Bone mapping can be saved and reused
14. ✅ Automatic rig detection for Mixamo, UE5, Unity, humanoid
15. ✅ Notifications inform user of operations and errors
16. ✅ Invalid models show detailed error messages
17. ✅ UI is responsive to window resizing
18. ✅ Export runs without blocking UI (offscreen rendering)
19. ✅ Application is stable (no crashes during typical use)
20. ✅ Cross-platform builds available (Windows primary)

---

This exhaustive plan covers all aspects of building the 3D Animation Viewer from initial setup to production release. Each phase is broken down into specific, actionable tasks that can be implemented independently. The plan prioritizes core functionality (loading, playback, export) while allowing advanced features (retargeting) to be added incrementally.

# Animexa3D - AI Coding Agent Instructions

## Project Overview
Animexa3D is an Electron desktop application for 3D animation retargeting and frame export. Built with Three.js for rendering and Vite for bundling.

## Architecture

### Layer Structure
```
src/main/           # Electron main process (Node.js, IPC handlers)
src/preload/        # Context bridge (exposes electronAPI to renderer)
src/renderer/       # UI and Three.js rendering
  └── modules/      # Domain-organized services
      ├── animation/    # Playback, timeline, collection services
      ├── core/         # Scene, camera, positioning, storage
      ├── io/           # Model loading, export, project I/O
      │   ├── services/     # Pure business logic (testable)
      │   └── adapters/     # UI adapters (thin wrappers)
      ├── retargeting/  # Bone mapping, skeleton analysis, pose normalization
      ├── services/     # Cross-cutting services (NotificationService)
      └── ui/           # UIManager and UI controllers
```

### Service Pattern (Follow This!)
The codebase uses a **Manager + Services + Adapter** pattern for testability:
- **Services**: Pure business logic, no DOM/Electron dependencies (e.g., `BoneMappingService`, `AnimationPlaybackService`)
- **Adapters**: Thin UI wrappers that delegate to services (e.g., `ExportUIAdapter`, `ProjectUIAdapter`)
- **Managers**: Orchestrators that coordinate services and adapters (e.g., `AnimationManager`, `SceneManager`)

Example from `src/renderer/modules/animation/`:
```javascript
// AnimationPlaybackService.js - Pure logic, fully testable
export class AnimationPlaybackService {
  initializePlayback(index, action) { /* no DOM */ }
  pause() { /* no DOM */ }
}
```

## Key Patterns

### Bone Mapping & Retargeting
The retargeting system detects rig types (Mixamo, UE5, Unity, humanoid) and maps bones:
- `BoneMappingService.detectRigType()` - Pattern matching on bone names
- `SkeletonAnalyzer` - Hierarchy analysis and bone extraction
- `RetargetingEngine` - Quaternion-based animation transfer
- See `tests/modules/BoneMappingService.test.js` for mapping logic tests

### Electron IPC
Main ↔ Renderer communication uses contextBridge:
```javascript
// preload/index.js exposes window.electronAPI
window.electronAPI.openModelDialog()  // Returns { path, name, data, extension }
window.electronAPI.saveProject(filePath, projectData, textureFiles)
```

### Three.js Conventions
- Models loaded via GLTFLoader/FBXLoader in `ModelLoader`
- Skeletons extracted with `SkeletonUtils` and `AnimationMixer`
- Coordinate system detection in `CoordinateSystemDetector` (handles Mixamo Y-up, UE Z-up, etc.)

## Testing

### Test Commands
```bash
npm test              # Run once (vitest run)
npm run test:watch    # Watch mode
npm run test:ui       # Visual UI
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E tests
```

### Test Structure
```
tests/
├── setup.js              # Mocks for electronAPI, WebGL, window
├── utils/testHelpers.js  # createMockSkeleton, createMockModel, createMockAnimationClip
├── modules/              # Unit tests per service
└── integration/          # Workflow tests
```

### Writing Tests
Use the existing mock helpers:
```javascript
import { createMockSkeleton, createMockAnimationClip } from '../utils/testHelpers.js';
import { BoneMappingService } from '@modules/retargeting/BoneMappingService.js';

describe('BoneMappingService', () => {
  it('should detect Mixamo rig', () => {
    const bones = ['mixamorig:Hips', 'mixamorig:Spine'];
    const service = new BoneMappingService();
    expect(service.detectRigType(bones)).toBe('mixamo');
  });
});
```

### Path Aliases (vitest.config.mjs)
```javascript
'@modules' → './src/renderer/modules'
'@renderer' → './src/renderer'
```

## Development Workflow

```bash
npm run dev      # Dev server with hot-reload (electron-vite)
npm run build    # Production build
npm run package  # Create distributable (electron-builder)
```

## Code Conventions

### Adding New Features
1. Create pure service class in appropriate domain folder (no DOM dependencies)
2. Add unit tests in `tests/modules/`
3. Create UI adapter if needed for DOM interactions
4. Wire through existing Manager or create new controller

### File Naming
- Services: `*Service.js` (pure logic)
- Adapters: `*UIAdapter.js` or `*UIController.js` (UI wrappers)
- Managers: `*Manager.js` (orchestrators)
- Tests: `*.test.js` matching source file name

### Error Handling
Use `NotificationService` for user-facing errors:
```javascript
import { NotificationService } from '@modules/services/NotificationService.js';
notificationService.show('Error loading model', 'error');
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/preload/index.js` | All Electron IPC methods exposed to renderer |
| `src/renderer/modules/retargeting/BoneMappingService.js` | Rig detection and bone mapping logic |
| `src/renderer/modules/io/services/` | All I/O-related pure services |
| `tests/setup.js` | Test mocks for Electron and WebGL |
| `tests/utils/testHelpers.js` | Three.js mock object factories |

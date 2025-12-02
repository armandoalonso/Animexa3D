# Animexa3D Test Suite

Comprehensive test suite for the Animexa3D animation retargeting application using Vitest.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Running Tests

```bash
# Run tests in watch mode (during development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.js                          # Global test setup and mocks
├── utils/
│   └── testHelpers.js               # Reusable test utilities
├── modules/                          # Unit tests for modules
│   ├── AnimationManager.test.js
│   ├── RetargetManager.test.js
│   ├── ModelLoader.test.js
│   └── CoordinateSystemDetector.test.js
└── integration/                      # Integration tests
    └── retargeting-workflow.test.js
```

## Test Coverage

Current test coverage includes:

### AnimationManager (✓ Complete)
- Loading and trimming animations
- Playing, pausing, stopping animations
- Animation controls (loop, scrub)
- Animation management (add, remove, rename)
- Timeline formatting

### RetargetManager (✓ Complete)
- Rig type detection (Mixamo, UE5, Unity, etc.)
- Automatic bone mapping
- Manual bone mapping operations
- Skeleton operations (clone, transform)
- Pose validation (T-pose, A-pose)
- Root bone detection

### ModelLoader (✓ Complete)
- Skeleton extraction
- Polygon counting
- Bone counting
- Bone structure compatibility checking
- Model info management

### CoordinateSystemDetector (✓ Complete)
- Coordinate system detection
- Conversion to canonical space
- Rotation computation
- Model transformation

### Integration Tests (✓ Complete)
- Full retargeting workflow
- Animation loading and management
- Model compatibility checking
- Error handling
- Performance benchmarks

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('YourModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Using Test Helpers

```javascript
import {
  createMockSkeleton,
  createMockModel,
  createMockAnimationClip,
  getHumanoidBoneNames
} from '../utils/testHelpers.js';

// Create a mock skeleton
const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

// Create a mock model with bones
const model = createMockModel(getHumanoidBoneNames('mixamo'));

// Create a mock animation
const clip = createMockAnimationClip('Walk', 2.0, ['Hips', 'Spine']);
```

### Mocking Electron APIs

The test setup automatically mocks all Electron APIs. Access them via:

```javascript
window.electronAPI.openModelDialog()
window.uiManager.showNotification()
```

## Test Conventions

### File Naming
- Unit tests: `ModuleName.test.js`
- Integration tests: `feature-name.test.js`
- Test helpers: `descriptiveName.js`

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names with `it('should...')`
- Keep tests focused on single behaviors
- Use `beforeEach` for common setup

### Assertions
- Use Vitest's built-in matchers (`expect`)
- Check for both success and failure cases
- Test edge cases and error conditions

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

### CI Requirements
- All tests must pass
- Code coverage must be maintained
- No failing tests allowed in main branch

## Code Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| AnimationManager | 90%+ |
| RetargetManager | 80%+ |
| ModelLoader | 90%+ |
| CoordinateSystemDetector | 85%+ |
| Overall | 80%+ |

## Common Testing Patterns

### Testing Three.js Objects

```javascript
import * as THREE from 'three';

const bone = new THREE.Bone();
bone.name = 'TestBone';
bone.position.set(0, 1, 0);
bone.updateMatrixWorld(true);

expect(bone.position.y).toBe(1);
```

### Testing Async Operations

```javascript
it('should load model asynchronously', async () => {
  const result = await modelLoader.loadFromBuffer(buffer, 'glb', 'test.glb');
  
  expect(result).toBeDefined();
  expect(result.model).toBeInstanceOf(THREE.Object3D);
});
```

### Testing DOM Updates

```javascript
beforeEach(() => {
  document.body.innerHTML = `
    <div id="animation-list"></div>
    <button id="btn-play"></button>
  `;
});

it('should update DOM', () => {
  animationManager.loadAnimations(clips);
  
  const list = document.getElementById('animation-list');
  expect(list.children.length).toBeGreaterThan(0);
});
```

## Troubleshooting

### Tests Failing Locally

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vitest cache:
   ```bash
   npx vitest --clearCache
   ```

3. Check Node.js version (requires 18+)

### WebGL/Canvas Errors

The test setup includes mocks for WebGL contexts. If you see canvas errors:
- Check that `tests/setup.js` is loaded
- Verify mocks are properly configured

### Three.js Import Errors

Ensure Three.js is imported correctly:
```javascript
import * as THREE from 'three';
// NOT: import THREE from 'three';
```

## Best Practices

1. **Keep tests independent**: Each test should run in isolation
2. **Mock external dependencies**: Don't rely on actual files or network
3. **Test behavior, not implementation**: Focus on what, not how
4. **Use meaningful test names**: Describe the expected behavior
5. **Maintain test coverage**: Add tests for new features
6. **Keep tests fast**: Aim for <100ms per test
7. **Test edge cases**: Include boundary conditions and error paths

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure tests pass locally
3. Add tests to relevant test file or create new one
4. Update this README if adding new test patterns
5. Run coverage report before submitting PR

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Testing Best Practices](https://testingjavascript.com/)

## License

MIT - Same as project license

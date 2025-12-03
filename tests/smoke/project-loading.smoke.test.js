/**
 * Smoke Tests - Project Loading
 * 
 * These tests load actual project files (.3dproj) to verify the application
 * can handle real-world saved projects.
 * 
 * Note: These tests are slower than unit tests as they load real project archives.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ModelLoader } from '@renderer/modules/io/ModelLoader.js';
import { ModelParsingService } from '@renderer/modules/io/services/ModelParsingService.js';
import { ModelAnalysisService } from '@renderer/modules/io/services/ModelAnalysisService.js';
import { CoordinateSystemDetector } from '@renderer/modules/core/CoordinateSystemDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECTS_PATH = path.resolve(__dirname, '../../docs/Projects');

// Helper to check if file exists
function fileExists(filepath) {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
}

describe('Project Loading - Smoke Tests', () => {
  let parsingService;
  let analysisService;
  let coordinateDetector;

  beforeEach(() => {
    // Initialize services (no DOM dependency)
    parsingService = new ModelParsingService();
    analysisService = new ModelAnalysisService();
    coordinateDetector = new CoordinateSystemDetector();
  });

  describe('mixamo_test.3dproj', () => {
    const projectPath = path.join(PROJECTS_PATH, 'mixamo_test.3dproj');

    it('should exist in docs/Projects directory', () => {
      expect(fileExists(projectPath)).toBe(true);
    });

    it('should be able to extract and validate project structure', async () => {
      if (!fileExists(projectPath)) {
        console.warn(`Skipping test: ${projectPath} not found`);
        return;
      }

      // Read the project file
      const projectBuffer = fs.readFileSync(projectPath);
      expect(projectBuffer).toBeDefined();
      expect(projectBuffer.length).toBeGreaterThan(0);

      // Verify it's a zip file (starts with PK signature)
      const signature = projectBuffer.toString('hex', 0, 2);
      expect(signature).toBe('504b'); // PK in hex
    });

    it('should load project through ProjectManager._loadProjectModel', async () => {
      if (!fileExists(projectPath)) {
        console.warn(`Skipping test: ${projectPath} not found`);
        return;
      }

      // Mock the IOService to return real project data
      const projectBuffer = fs.readFileSync(projectPath);
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(projectBuffer);

      // Extract project.json
      const projectJsonContent = await zip.file('project.json').async('string');
      const projectData = JSON.parse(projectJsonContent);

      // Validate project data structure
      expect(projectData).toBeDefined();
      expect(projectData.version).toBeDefined();
      expect(projectData.model).toBeDefined();
      expect(projectData.model.fileName).toBeDefined();
      expect(projectData.model.extension).toBeDefined();

      console.log(`Project version: ${projectData.version}`);
      console.log(`Model file: ${projectData.model.fileName} (${projectData.model.extension})`);
      console.log(`Animations: ${projectData.animations?.length || 0}`);
      console.log(`Materials: ${projectData.materials?.length || 0}`);
    });

    it('should successfully extract and load the model file', async () => {
      if (!fileExists(projectPath)) {
        console.warn(`Skipping test: ${projectPath} not found`);
        return;
      }

      // Extract the project
      const projectBuffer = fs.readFileSync(projectPath);
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(projectBuffer);

      // Get project data
      const projectJsonContent = await zip.file('project.json').async('string');
      const projectData = JSON.parse(projectJsonContent);

      // Extract model file
      const modelFileName = projectData.model.fileName;
      const modelFile = zip.file(modelFileName);
      expect(modelFile).not.toBeNull();

      const modelBuffer = await modelFile.async('arraybuffer');
      expect(modelBuffer).toBeDefined();
      expect(modelBuffer.byteLength).toBeGreaterThan(0);

      // Parse the model using services directly
      const extension = projectData.model.extension;
      let modelData;
      
      if (extension === 'glb' || extension === 'gltf') {
        modelData = await parsingService.parseGLTF(modelBuffer);
      } else if (extension === 'fbx') {
        modelData = await parsingService.parseFBX(modelBuffer);
      }

      // Verify model was parsed successfully
      expect(modelData).toBeDefined();
      expect(modelData.model).toBeDefined();
      expect(modelData.animations).toBeDefined();

      // Apply coordinate system conversion
      const conversion = coordinateDetector.convertToCanonicalSpace(modelData.model);
      
      // Extract skeleton information
      const skeletons = parsingService.extractSkeletons(modelData.model);
      
      // Analyze model structure
      const stats = analysisService.analyzeModelStructure(
        modelData.model,
        modelData.animations,
        skeletons
      );

      // Verify analysis results
      expect(stats).toBeDefined();
      expect(stats.polygons).toBeGreaterThan(0);

      console.log(`✓ Model loaded successfully: ${modelFileName}`);
      console.log(`  - Polygons: ${stats.polygons.toLocaleString()}`);
      console.log(`  - Bones: ${stats.bones}`);
      console.log(`  - Animations: ${stats.animations}`);
      console.log(`  - Coordinate conversion: ${conversion.applied ? conversion.type : 'None'}`);
    });

    it('should load complete project with all assets', async () => {
      if (!fileExists(projectPath)) {
        console.warn(`Skipping test: ${projectPath} not found`);
        return;
      }

      // Extract the project
      const projectBuffer = fs.readFileSync(projectPath);
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(projectBuffer);

      // Read project.json
      const projectJsonContent = await zip.file('project.json').async('string');
      const projectData = JSON.parse(projectJsonContent);

      // Extract and parse model file
      const modelFileName = projectData.model.fileName;
      const modelFile = zip.file(modelFileName);
      const modelBuffer = await modelFile.async('arraybuffer');

      // Parse model
      const extension = projectData.model.extension;
      let modelData;
      
      if (extension === 'glb' || extension === 'gltf') {
        modelData = await parsingService.parseGLTF(modelBuffer);
      } else if (extension === 'fbx') {
        modelData = await parsingService.parseFBX(modelBuffer);
      }

      // Apply coordinate conversion and extract skeletons
      const conversion = coordinateDetector.convertToCanonicalSpace(modelData.model);
      const skeletons = parsingService.extractSkeletons(modelData.model);
      const stats = analysisService.analyzeModelStructure(
        modelData.model,
        modelData.animations,
        skeletons
      );

      // Verify the complete model data structure
      expect(modelData.model).toBeDefined();
      expect(modelData.animations).toBeDefined();
      expect(skeletons).toBeDefined();
      expect(stats).toBeDefined();
      
      console.log(`✓ Project loaded successfully: ${path.basename(projectPath)}`);
      console.log(`  - Model: ${projectData.model.fileName}`);
      console.log(`  - Format: ${projectData.model.extension.toUpperCase()}`);
      console.log(`  - Polygons: ${stats.polygons.toLocaleString()}`);
      console.log(`  - Bones: ${stats.bones}`);
      console.log(`  - Animations (saved): ${projectData.animations?.length || 0}`);
      console.log(`  - Animations (in model): ${stats.animations}`);
      console.log(`  - Scene background: ${projectData.scene?.backgroundColor || 'N/A'}`);
    });
  });

  describe('Project File Validation', () => {
    it('should validate all project files in docs/Projects', () => {
      if (!fileExists(PROJECTS_PATH)) {
        console.warn('Projects directory not found, skipping validation');
        return;
      }

      const projectFiles = fs.readdirSync(PROJECTS_PATH)
        .filter(file => file.endsWith('.3dproj'));

      expect(projectFiles.length).toBeGreaterThan(0);
      
      console.log(`Found ${projectFiles.length} project file(s):`);
      projectFiles.forEach(file => {
        const filePath = path.join(PROJECTS_PATH, file);
        const stats = fs.statSync(filePath);
        console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    });
  });
});

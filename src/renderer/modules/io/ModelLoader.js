import { CoordinateSystemDetector } from '../core/CoordinateSystemDetector.js';
import { ModelParsingService } from './services/ModelParsingService.js';
import { ModelAnalysisService } from './services/ModelAnalysisService.js';
import { ModelLoaderUIAdapter } from './adapters/ModelLoaderUIAdapter.js';

/**
 * ModelLoader - Thin orchestrator for model loading operations
 * Coordinates between parsing, analysis, coordinate system conversion, and UI updates
 */
export class ModelLoader {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.currentModelData = null;
    
    // Services (pure logic, testable)
    this.parsingService = new ModelParsingService();
    this.analysisService = new ModelAnalysisService();
    this.coordinateDetector = new CoordinateSystemDetector();
    
    // UI Adapter (handles all DOM/notifications)
    this.uiAdapter = new ModelLoaderUIAdapter();
  }
  
  /**
   * Load model from array buffer
   * @param {ArrayBuffer} arrayBuffer - File buffer
   * @param {string} extension - File extension
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} - Model data with metadata
   */
  async loadFromBuffer(arrayBuffer, extension, filename) {
    // Show loading UI
    this.uiAdapter.showLoadingOverlay();
    
    try {
      // Validate extension
      const normalizedExtension = this.parsingService.validateExtension(extension);
      
      // Parse model file
      let modelData;
      if (normalizedExtension === 'glb' || normalizedExtension === 'gltf') {
        modelData = await this.parsingService.parseGLTF(arrayBuffer);
      } else if (normalizedExtension === 'fbx') {
        modelData = await this.parsingService.parseFBX(arrayBuffer);
      }
      
      // Apply coordinate system conversion
      const conversion = this.coordinateDetector.convertToCanonicalSpace(modelData.model);
      
      // Extract skeleton information
      const skeletons = this.parsingService.extractSkeletons(modelData.model);
      
      // Analyze model structure
      const stats = this.analysisService.analyzeModelStructure(
        modelData.model,
        modelData.animations,
        skeletons
      );
      
      // Prepare complete model data
      const completeModelData = {
        model: modelData.model,
        animations: modelData.animations,
        skeletons: skeletons,
        coordinateConversion: conversion,
        filename: filename,
        name: filename,
        bufferData: arrayBuffer,
        stats: stats
      };
      
      this.currentModelData = completeModelData;
      
      // Add model to scene
      this.sceneManager.addModel(modelData.model);
      
      // Create animation mixer if animations exist
      if (stats.hasAnimations) {
        this.sceneManager.createMixer(modelData.model);
      }
      
      // Update UI
      this.uiAdapter.updateModelInfo(
        filename,
        stats.polygons,
        stats.animations,
        stats.bones
      );
      this.uiAdapter.showLoadSuccess(filename);
      this.uiAdapter.logLoadDetails(filename, stats);
      
      return completeModelData;
      
    } catch (error) {
      console.error('Error loading model:', error);
      this.uiAdapter.showLoadError(error.message);
      this.uiAdapter.showEmptyState();
      throw error;
    } finally {
      this.uiAdapter.hideLoadingOverlay();
    }
  }
  
  /**
   * Load animation file to extract animations and bone structure
   * Used for adding animations from external files
   * @param {ArrayBuffer} arrayBuffer - File buffer
   * @param {string} extension - File extension
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} - Animation data with bone structure
   */
  async loadAnimationFile(arrayBuffer, extension, filename) {
    try {
      // Validate extension
      const normalizedExtension = this.parsingService.validateExtension(extension);
      
      // Parse model file
      let modelData;
      if (normalizedExtension === 'glb' || normalizedExtension === 'gltf') {
        modelData = await this.parsingService.parseGLTF(arrayBuffer);
      } else if (normalizedExtension === 'fbx') {
        modelData = await this.parsingService.parseFBX(arrayBuffer);
      }
      
      // Apply coordinate system conversion
      const conversion = this.coordinateDetector.convertToCanonicalSpace(modelData.model);
      
      // Extract skeletons with fallback to hierarchy bones
      const skeletons = this.parsingService.extractSkeletonsWithFallback(modelData.model);
      
      const result = {
        filename: filename,
        animations: modelData.animations || [],
        skeletons: skeletons,
        boneNames: skeletons.boneNames || [],
        model: modelData.model,
        coordinateConversion: conversion
      };
      
      // Log details
      this.uiAdapter.logAnimationFileDetails(
        filename,
        result.animations.length,
        result.boneNames.length
      );
      
      return result;
      
    } catch (error) {
      console.error('Error loading animation file:', error);
      throw error;
    }
  }
  
  
  /**
   * Get current model data
   * @returns {Object|null} - Current model data
   */
  getCurrentModelData() {
    return this.currentModelData;
  }
  
  /**
   * Clear current model and reset UI
   */
  clearCurrentModel() {
    this.currentModelData = null;
    this.uiAdapter.clearModelInfo();
  }
  
  /**
   * Load model from array buffer without UI updates (for internal use)
   * @param {ArrayBuffer} arrayBuffer - File buffer
   * @param {string} extension - File extension
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} - Model data with metadata
   */
  async loadFromBufferSilent(arrayBuffer, extension, filename) {
    try {
      // Validate extension
      const normalizedExtension = this.parsingService.validateExtension(extension);
      
      // Parse model file
      let modelData;
      if (normalizedExtension === 'glb' || normalizedExtension === 'gltf') {
        modelData = await this.parsingService.parseGLTF(arrayBuffer);
      } else if (normalizedExtension === 'fbx') {
        modelData = await this.parsingService.parseFBX(arrayBuffer);
      }
      
      // Apply coordinate system conversion
      const conversion = this.coordinateDetector.convertToCanonicalSpace(modelData.model);
      
      // Extract skeleton information
      const skeletons = this.parsingService.extractSkeletons(modelData.model);
      
      // Analyze model structure
      const stats = this.analysisService.analyzeModelStructure(
        modelData.model,
        modelData.animations,
        skeletons
      );
      
      // Prepare complete model data
      const completeModelData = {
        model: modelData.model,
        animations: modelData.animations,
        skeletons: skeletons,
        coordinateConversion: conversion,
        filename: filename,
        name: filename,
        bufferData: arrayBuffer,
        stats: stats
      };
      
      return completeModelData;
      
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }
  
  /**
   * Verify if two bone structures are compatible
   * @param {Object} sourceSkeletons - Source skeleton data
   * @param {Object} targetSkeletons - Target skeleton data
   * @returns {Object} - Compatibility result with details
   */
  verifyBoneStructureCompatibility(sourceSkeletons, targetSkeletons) {
    const result = this.analysisService.verifyBoneCompatibility(
      sourceSkeletons,
      targetSkeletons
    );
    
    // Log compatibility details
    this.uiAdapter.logCompatibilityDetails(result);
    
    return result;
  }
}

/**
 * IO Services - Pure business logic services
 * Fully testable, no DOM or I/O dependencies (except specific loader services with injected deps)
 */

// Texture Services
export { TextureExtractionService } from './TextureExtractionService.js';
export { TextureMetadataService } from './TextureMetadataService.js';
export { MaterialManagementService } from './MaterialManagementService.js';
export { TextureLoaderService } from './TextureLoaderService.js';

// Model Services
export { ModelParsingService } from './ModelParsingService.js';
export { ModelAnalysisService } from './ModelAnalysisService.js';

/**
 * FrameExportService
 * Pure business logic for frame export calculations and filename generation.
 * No UI dependencies, fully testable.
 */
export class FrameExportService {
  /**
   * Calculate the total number of frames needed for export
   * @param {number} duration - Animation duration in seconds
   * @param {number} fps - Frames per second
   * @returns {number} Total frame count
   */
  calculateExportFrames(duration, fps) {
    if (duration < 0 || fps <= 0) {
      throw new Error('Invalid duration or fps');
    }
    return Math.ceil(duration * fps);
  }

  /**
   * Calculate the time for a specific frame
   * @param {number} frameIndex - Zero-based frame index
   * @param {number} fps - Frames per second
   * @returns {number} Time in seconds for this frame
   */
  calculateFrameTime(frameIndex, fps) {
    if (frameIndex < 0 || fps <= 0) {
      throw new Error('Invalid frame index or fps');
    }
    return frameIndex / fps;
  }

  /**
   * Generate a filename for a specific frame
   * @param {number} frameIndex - Zero-based frame index
   * @param {string} format - File format extension (e.g., 'png')
   * @param {number} paddingLength - Number of digits for zero-padding (default: 3)
   * @returns {string} Formatted filename
   */
  generateFrameFilename(frameIndex, format = 'png', paddingLength = 3) {
    if (frameIndex < 0) {
      throw new Error('Frame index must be non-negative');
    }
    const paddedIndex = String(frameIndex).padStart(paddingLength, '0');
    return `frame_${paddedIndex}.${format}`;
  }

  /**
   * Calculate time step between frames
   * @param {number} fps - Frames per second
   * @returns {number} Time step in seconds
   */
  calculateTimeStep(fps) {
    if (fps <= 0) {
      throw new Error('FPS must be positive');
    }
    return 1 / fps;
  }

  /**
   * Calculate export progress percentage
   * @param {number} currentFrame - Current frame being processed
   * @param {number} totalFrames - Total number of frames
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(currentFrame, totalFrames) {
    if (totalFrames === 0) return 0;
    return (currentFrame / totalFrames) * 100;
  }

  /**
   * Estimate remaining time for export
   * @param {number} elapsedMs - Elapsed time in milliseconds
   * @param {number} currentFrame - Current frame being processed
   * @param {number} totalFrames - Total number of frames
   * @returns {number} Estimated remaining time in seconds
   */
  estimateRemainingTime(elapsedMs, currentFrame, totalFrames) {
    if (currentFrame === 0) return 0;
    const avgTimePerFrame = elapsedMs / currentFrame;
    const remainingFrames = totalFrames - currentFrame;
    const remainingMs = remainingFrames * avgTimePerFrame;
    return Math.ceil(remainingMs / 1000);
  }
}

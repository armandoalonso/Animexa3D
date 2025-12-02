/**
 * AnimationTimelineService - Pure business logic for timeline calculations
 * No DOM dependencies, fully testable
 */
export class AnimationTimelineService {
  /**
   * Format time in MM:SS:FF format (FF = frames at 24fps)
   * @param {number} seconds - Time in seconds
   * @param {number} fps - Frames per second (default 24)
   * @returns {string} Formatted time string
   */
  formatTime(seconds, fps = 24) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate timeline position (0 to 1) from current time and duration
   * @param {number} currentTime - Current time in seconds
   * @param {number} duration - Total duration in seconds
   * @returns {number} Position from 0 to 1
   */
  calculateTimelinePosition(currentTime, duration) {
    if (duration === 0) return 0;
    return Math.max(0, Math.min(1, currentTime / duration));
  }

  /**
   * Calculate time from timeline position
   * @param {number} position - Position from 0 to 1
   * @param {number} duration - Total duration in seconds
   * @returns {number} Time in seconds
   */
  calculateTimeFromPosition(position, duration) {
    return Math.max(0, Math.min(duration, position * duration));
  }

  /**
   * Parse time string (MM:SS:FF) to seconds
   * @param {string} timeString - Time string in MM:SS:FF format
   * @param {number} fps - Frames per second (default 24)
   * @returns {number} Time in seconds
   */
  parseTimeString(timeString, fps = 24) {
    const parts = timeString.split(':').map(p => parseInt(p, 10));
    if (parts.length !== 3) return 0;
    
    const [mins, secs, frames] = parts;
    return (mins * 60) + secs + (frames / fps);
  }

  /**
   * Calculate time offset for scrubbing
   * @param {number} currentTime - Current time
   * @param {number} delta - Time delta (positive or negative)
   * @param {number} duration - Total duration
   * @returns {number} New time clamped to valid range
   */
  calculateScrubTime(currentTime, delta, duration) {
    const newTime = currentTime + delta;
    return Math.max(0, Math.min(duration, newTime));
  }

  /**
   * Calculate frames per second from duration and frame count
   * @param {number} duration - Duration in seconds
   * @param {number} frameCount - Number of frames
   * @returns {number} Frames per second
   */
  calculateFPS(duration, frameCount) {
    if (duration === 0) return 0;
    return frameCount / duration;
  }

  /**
   * Calculate frame count from duration and fps
   * @param {number} duration - Duration in seconds
   * @param {number} fps - Frames per second
   * @returns {number} Number of frames (rounded up)
   */
  calculateFrameCount(duration, fps) {
    return Math.ceil(duration * fps);
  }

  /**
   * Calculate time for a specific frame
   * @param {number} frameIndex - Frame index (0-based)
   * @param {number} fps - Frames per second
   * @returns {number} Time in seconds
   */
  calculateFrameTime(frameIndex, fps) {
    if (fps === 0) return 0;
    return frameIndex / fps;
  }

  /**
   * Calculate frame index from time
   * @param {number} time - Time in seconds
   * @param {number} fps - Frames per second
   * @returns {number} Frame index (0-based)
   */
  calculateFrameIndex(time, fps) {
    return Math.floor(time * fps);
  }

  /**
   * Validate timeline position
   * @param {number} position - Position value
   * @returns {boolean} True if valid (between 0 and 1)
   */
  isValidPosition(position) {
    return typeof position === 'number' && position >= 0 && position <= 1;
  }

  /**
   * Validate time value
   * @param {number} time - Time value
   * @param {number} duration - Duration limit
   * @returns {boolean} True if valid (non-negative and within duration)
   */
  isValidTime(time, duration) {
    return typeof time === 'number' && time >= 0 && time <= duration;
  }

  /**
   * Calculate playback speed multiplier for a given time range
   * @param {number} originalDuration - Original duration
   * @param {number} targetDuration - Target duration
   * @returns {number} Speed multiplier
   */
  calculateSpeedMultiplier(originalDuration, targetDuration) {
    if (targetDuration === 0) return 1;
    return originalDuration / targetDuration;
  }
}

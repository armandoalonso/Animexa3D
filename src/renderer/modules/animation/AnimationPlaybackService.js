import * as THREE from 'three';

/**
 * AnimationPlaybackService - Pure business logic for animation playback
 * No DOM dependencies, fully testable
 */
export class AnimationPlaybackService {
  constructor() {
    this.currentAnimationIndex = -1;
    this.isPlaying = false;
    this.loopEnabled = false;
    this.currentAction = null;
  }

  /**
   * Get the current animation index
   * @returns {number} Current animation index or -1 if none
   */
  getCurrentAnimationIndex() {
    return this.currentAnimationIndex;
  }

  /**
   * Check if animation is currently playing
   * @returns {boolean} True if playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Check if loop is enabled
   * @returns {boolean} True if loop is enabled
   */
  getLoopEnabled() {
    return this.loopEnabled;
  }

  /**
   * Get current action
   * @returns {THREE.AnimationAction|null} Current action
   */
  getCurrentAction() {
    return this.currentAction;
  }

  /**
   * Set the current action
   * @param {THREE.AnimationAction} action - Animation action
   */
  setCurrentAction(action) {
    this.currentAction = action;
  }

  /**
   * Initialize playback state for a new animation
   * @param {number} index - Animation index
   * @param {THREE.AnimationAction} action - Animation action
   */
  initializePlayback(index, action) {
    this.currentAnimationIndex = index;
    this.currentAction = action;
    this.isPlaying = true;
  }

  /**
   * Pause the current animation
   */
  pause() {
    if (this.currentAction) {
      this.currentAction.paused = true;
      this.isPlaying = false;
    }
  }

  /**
   * Resume the current animation
   */
  resume() {
    if (this.currentAction) {
      if (!this.currentAction.isRunning()) {
        this.currentAction.reset().play();
      } else {
        this.currentAction.paused = false;
      }
      this.isPlaying = true;
    }
  }

  /**
   * Stop the current animation
   */
  stop() {
    if (this.currentAction) {
      this.currentAction.stop();
      this.isPlaying = false;
    }
  }

  /**
   * Set loop mode
   * @param {boolean} enabled - Whether loop is enabled
   */
  setLoop(enabled) {
    this.loopEnabled = enabled;
    if (this.currentAction) {
      this.currentAction.setLoop(
        this.loopEnabled ? THREE.LoopRepeat : THREE.LoopOnce
      );
    }
  }

  /**
   * Toggle loop mode
   * @returns {boolean} New loop state
   */
  toggleLoop() {
    this.setLoop(!this.loopEnabled);
    return this.loopEnabled;
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds, or 0 if no action
   */
  getCurrentTime() {
    if (!this.currentAction) return 0;
    return this.currentAction.time;
  }

  /**
   * Set playback time
   * @param {number} time - Time in seconds
   */
  setTime(time) {
    if (!this.currentAction) return;
    this.currentAction.time = time;
  }

  /**
   * Get current animation duration
   * @returns {number} Duration in seconds, or 0 if no action
   */
  getDuration() {
    if (!this.currentAction) return 0;
    return this.currentAction.getClip().duration;
  }

  /**
   * Check if animation has finished
   * @returns {boolean} True if animation is finished
   */
  isFinished() {
    if (!this.currentAction) return true;
    return !this.currentAction.isRunning() && !this.currentAction.paused;
  }

  /**
   * Reset playback state
   */
  reset() {
    this.currentAnimationIndex = -1;
    this.currentAction = null;
    this.isPlaying = false;
  }

  /**
   * Check if there is an active animation
   * @returns {boolean} True if there is an active animation
   */
  hasActiveAnimation() {
    return this.currentAction !== null;
  }

  /**
   * Check if action exists (alias for hasActiveAnimation)
   * @returns {boolean} True if action exists
   */
  hasAction() {
    return this.hasActiveAnimation();
  }

  /**
   * Check if currently looping
   * @returns {boolean} True if looping is enabled
   */
  getIsLooping() {
    return this.loopEnabled;
  }

  /**
   * Calculate playback progress (0 to 1)
   * @returns {number} Progress from 0 to 1, or 0 if no action
   */
  getProgress() {
    if (!this.currentAction) return 0;
    const duration = this.getDuration();
    if (duration === 0) return 0;
    return this.getCurrentTime() / duration;
  }
}

import * as THREE from 'three';

/**
 * AnimationCollectionService - Pure business logic for managing animation collections
 * No DOM dependencies, fully testable
 */
export class AnimationCollectionService {
  constructor() {
    this.animations = [];
  }

  /**
   * Load animations, replacing existing collection
   * @param {THREE.AnimationClip[]} animations - Array of animation clips
   * @returns {THREE.AnimationClip[]} The loaded animations
   */
  loadAnimations(animations) {
    console.log('AnimationCollectionService.loadAnimations called with:', animations.map(a => a.name));
    
    // Trim empty space from the start of animations
    this.animations = animations.map(clip => this.trimAnimationClip(clip));
    
    console.log('After loading, animations:', this.animations.map(a => a.name));
    return this.animations;
  }

  /**
   * Add new animations to the existing collection
   * @param {THREE.AnimationClip[]} newAnimations - Array of animation clips to add
   * @returns {number} Total number of animations after adding
   */
  addAnimations(newAnimations) {
    if (!newAnimations || newAnimations.length === 0) {
      return this.animations.length;
    }
    
    // Trim and add new animations
    const trimmedAnimations = newAnimations.map(clip => this.trimAnimationClip(clip));
    this.animations.push(...trimmedAnimations);
    
    return this.animations.length;
  }

  /**
   * Remove an animation by index
   * @param {number} index - Index of animation to remove
   * @returns {THREE.AnimationClip|null} The removed animation, or null if invalid index
   */
  removeAnimation(index) {
    if (index < 0 || index >= this.animations.length) {
      return null;
    }
    
    const removed = this.animations.splice(index, 1);
    return removed.length > 0 ? removed[0] : null;
  }

  /**
   * Rename an animation
   * @param {number} index - Index of animation to rename
   * @param {string} newName - New name for the animation
   * @returns {boolean} True if renamed successfully, false otherwise
   */
  renameAnimation(index, newName) {
    if (index < 0 || index >= this.animations.length) {
      return false;
    }
    
    if (!newName || newName.trim() === '') {
      return false;
    }
    
    this.animations[index].name = newName.trim();
    return true;
  }

  /**
   * Get all animations
   * @returns {THREE.AnimationClip[]} Array of all animations
   */
  getAnimations() {
    return this.animations;
  }

  /**
   * Get a specific animation by index
   * @param {number} index - Animation index
   * @returns {THREE.AnimationClip|null} Animation clip or null if invalid index
   */
  getAnimation(index) {
    if (index < 0 || index >= this.animations.length) {
      return null;
    }
    return this.animations[index];
  }

  /**
   * Get animation count
   * @returns {number} Number of animations
   */
  getAnimationCount() {
    return this.animations.length;
  }

  /**
   * Check if there are any animations
   * @returns {boolean} True if there are animations
   */
  hasAnimations() {
    return this.animations.length > 0;
  }

  /**
   * Clear all animations
   */
  clear() {
    this.animations = [];
  }

  /**
   * Find animation index by name
   * @param {string} name - Animation name
   * @returns {number} Index of animation, or -1 if not found
   */
  findAnimationByName(name) {
    return this.animations.findIndex(anim => anim.name === name);
  }

  /**
   * Get animation names
   * @returns {string[]} Array of animation names
   */
  getAnimationNames() {
    return this.animations.map(anim => anim.name || 'Unnamed');
  }

  /**
   * Trim empty space from the start of an animation clip
   * @param {THREE.AnimationClip} clip - The animation clip to trim
   * @returns {THREE.AnimationClip} The trimmed clip
   */
  trimAnimationClip(clip) {
    // Find the earliest keyframe across all tracks
    let earliestKeyframe = Infinity;
    
    clip.tracks.forEach(track => {
      if (track.times && track.times.length > 0) {
        earliestKeyframe = Math.min(earliestKeyframe, track.times[0]);
      }
    });
    
    // If animation starts at or near 0, no trimming needed
    if (earliestKeyframe < 0.01 || earliestKeyframe === Infinity) {
      return clip;
    }
    
    console.log(`✂️ Trimming ${earliestKeyframe.toFixed(3)}s from start of "${clip.name}"`);
    
    // Create new tracks with shifted times
    const newTracks = clip.tracks.map(track => {
      if (!track.times || track.times.length === 0) {
        return track;
      }
      
      // Shift all keyframe times by subtracting the earliest time
      const newTimes = track.times.map(t => t - earliestKeyframe);
      
      // Create new track with shifted times
      const TrackConstructor = track.constructor;
      return new TrackConstructor(
        track.name,
        newTimes,
        track.values.slice(), // Copy values array
        track.interpolation
      );
    });
    
    // Create new clip with trimmed duration
    const newDuration = clip.duration - earliestKeyframe;
    const trimmedClip = new THREE.AnimationClip(clip.name, newDuration, newTracks);
    
    console.log(`   Original: ${clip.duration.toFixed(3)}s → Trimmed: ${newDuration.toFixed(3)}s`);
    
    return trimmedClip;
  }

  /**
   * Validate animation clip
   * @param {THREE.AnimationClip} clip - Animation clip to validate
   * @returns {boolean} True if valid
   */
  isValidClip(clip) {
    return clip instanceof THREE.AnimationClip && 
           clip.tracks && 
           Array.isArray(clip.tracks) &&
           clip.tracks.length > 0;
  }

  /**
   * Get animation statistics
   * @param {number} index - Animation index
   * @returns {Object|null} Statistics object or null if invalid index
   */
  getAnimationStats(index) {
    const clip = this.getAnimation(index);
    if (!clip) return null;

    let earliestKeyframe = Infinity;
    let latestKeyframe = -Infinity;
    const trackTypes = new Set();

    clip.tracks.forEach(track => {
      trackTypes.add(track.constructor.name);
      if (track.times && track.times.length > 0) {
        earliestKeyframe = Math.min(earliestKeyframe, track.times[0]);
        latestKeyframe = Math.max(latestKeyframe, track.times[track.times.length - 1]);
      }
    });

    return {
      name: clip.name,
      duration: clip.duration,
      trackCount: clip.tracks.length,
      trackTypes: Array.from(trackTypes),
      earliestKeyframe: earliestKeyframe === Infinity ? 0 : earliestKeyframe,
      latestKeyframe: latestKeyframe === -Infinity ? 0 : latestKeyframe,
      hasPositionTracks: clip.tracks.some(t => t.name.endsWith('.position'))
    };
  }

  /**
   * Duplicate an animation
   * @param {number} index - Index of animation to duplicate
   * @param {string} newName - Optional new name for the duplicate
   * @returns {THREE.AnimationClip|null} The duplicated clip or null
   */
  duplicateAnimation(index, newName) {
    const clip = this.getAnimation(index);
    if (!clip) return null;

    const duplicate = clip.clone();
    duplicate.name = newName || `${clip.name}_copy`;
    this.animations.push(duplicate);
    
    return duplicate;
  }
}

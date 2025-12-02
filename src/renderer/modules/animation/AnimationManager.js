import * as THREE from 'three';
import { AnimationPlaybackService } from './AnimationPlaybackService.js';
import { AnimationTimelineService } from './AnimationTimelineService.js';
import { AnimationCollectionService } from './AnimationCollectionService.js';

export class AnimationManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    
    // Initialize services
    this.playbackService = new AnimationPlaybackService();
    this.timelineService = new AnimationTimelineService();
    this.collectionService = new AnimationCollectionService();
    
    // Track current state
    this.currentAnimationIndex = -1;
    this.timelineUpdateInterval = null;
  }
  
  loadAnimations(animations) {
    console.log('AnimationManager.loadAnimations called with:', animations.map(a => a.name));
    
    // Use collection service to load and trim animations
    this.collectionService.loadAnimations(animations);
    
    // Reset playback state
    this.playbackService.reset();
    this.currentAnimationIndex = -1;
    
    // Update UI
    this.populateAnimationList();
    this.updateTimelineUI();
    console.log('After loading, this.animations:', this.collectionService.getAnimations().map(a => a.name));
  }
  
  populateAnimationList() {
    const animationList = document.getElementById('animation-list');
    animationList.innerHTML = '';
    
    const animations = this.collectionService.getAnimations();
    
    if (animations.length === 0) {
      animationList.innerHTML = '<div class="empty-state"><p class="has-text-grey">No animations found</p></div>';
      return;
    }
    
    animations.forEach((clip, index) => {
      const container = document.createElement('div');
      container.className = 'animation-list-item';
      
      const button = document.createElement('button');
      button.className = 'button is-fullwidth animation-item';
      button.innerHTML = `
        <div style="text-align: left; width: 100%; overflow: hidden;">
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>${clip.name || `Animation ${index + 1}`}</strong></div>
          <div style="font-size: 0.8rem; opacity: 0.7;">${clip.duration.toFixed(2)}s</div>
        </div>
      `;
      button.onclick = () => this.playAnimation(index);
      
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = 'display: flex; gap: 0.25rem;';
      
      const renameBtn = document.createElement('button');
      renameBtn.className = 'button is-info is-small';
      renameBtn.style.cssText = 'flex: 1;';
      renameBtn.innerHTML = '✎ Rename';
      renameBtn.title = 'Rename animation';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        this.openRenameModal(index);
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button is-danger is-small';
      deleteBtn.style.cssText = 'flex: 1;';
      deleteBtn.innerHTML = '✕ Delete';
      deleteBtn.title = 'Remove animation';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeAnimation(index);
      };
      
      buttonsContainer.appendChild(renameBtn);
      buttonsContainer.appendChild(deleteBtn);
      container.appendChild(button);
      container.appendChild(buttonsContainer);
      animationList.appendChild(container);
    });
  }
  
  playAnimation(index) {
    const animations = this.collectionService.getAnimations();
    if (index < 0 || index >= animations.length) return;
    
    const mixer = this.sceneManager.getMixer();
    if (!mixer) return;
    
    // Get the clip
    const clip = animations[index];
    
    console.log(`🎬 Playing animation: ${clip.name}`);
    console.log(`   Duration: ${clip.duration.toFixed(3)}s`);
    console.log(`   Tracks: ${clip.tracks.length}`);
    
    // Get animation statistics for debugging
    const stats = this.collectionService.getAnimationStats(index);
    if (stats && stats.actualLength !== undefined) {
      console.log(`   ⏱️ First keyframe: ${stats.earliestKeyframe.toFixed(3)}s`);
      console.log(`   ⏱️ Last keyframe: ${stats.latestKeyframe.toFixed(3)}s`);
      console.log(`   ⏱️ Actual animation length: ${stats.actualLength.toFixed(3)}s`);
      
      if (stats.earliestKeyframe > 0.1) {
        console.warn(`   ⚠️ Animation has ${stats.earliestKeyframe.toFixed(3)}s of empty space at the start!`);
      }
      
      if (stats.hasPosition) {
        console.log(`   📍 Position tracks found: ${stats.trackTypes.position}`);
      } else {
        console.log('   ⚠️ No position tracks - animation will play in place');
      }
    }
    
    // Initialize playback using service
    const action = mixer.clipAction(clip);
    this.playbackService.initializePlayback(index, action);
    
    // Listen for animation finished event
    const onFinished = () => {
      if (!this.playbackService.getIsLooping()) {
        this.updatePlaybackButtonsUI();
      }
    };
    
    mixer.addEventListener('finished', onFinished);
    
    this.currentAnimationIndex = index;
    
    // Update UI
    this.updateAnimationListUI();
    this.updatePlaybackButtonsUI();
    this.resetTimeline();
    
    // Update timeline in render loop
    this.startTimelineUpdate();
  }
  
  pauseAnimation() {
    this.playbackService.pause();
    this.updatePlaybackButtonsUI();
  }
  
  resumeAnimation() {
    this.playbackService.resume();
    this.updatePlaybackButtonsUI();
    this.startTimelineUpdate();
  }
  
  stopAnimation() {
    this.playbackService.stop();
    this.resetTimeline();
    this.updatePlaybackButtonsUI();
  }
  
  togglePlayPause() {
    if (this.playbackService.getIsPlaying()) {
      this.pauseAnimation();
    } else if (this.playbackService.hasAction()) {
      this.resumeAnimation();
    } else if (this.collectionService.hasAnimations()) {
      this.playAnimation(0);
    }
  }
  
  setLoop(enabled) {
    this.playbackService.setLoop(enabled);
    
    // If switching to loop mode and animation finished, restart it
    if (enabled && !this.playbackService.getIsPlaying() && this.playbackService.hasAction()) {
      this.playbackService.resume();
      this.updatePlaybackButtonsUI();
      this.startTimelineUpdate();
    }
  }
  
  toggleLoop() {
    this.setLoop(!this.playbackService.getIsLooping());
  }
  
  changeAnimation(direction) {
    const count = this.collectionService.getAnimationCount();
    if (count === 0) return;
    
    let newIndex = this.currentAnimationIndex + direction;
    if (newIndex < 0) newIndex = count - 1;
    if (newIndex >= count) newIndex = 0;
    
    this.playAnimation(newIndex);
  }
  
  updateAnimationListUI() {
    const buttons = document.querySelectorAll('.animation-item');
    buttons.forEach((button, index) => {
      if (index === this.currentAnimationIndex) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });
  }
  
  updatePlaybackButtonsUI() {
    const hasAnimation = this.collectionService.hasAnimations();
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');
    const timeSlider = document.getElementById('time-slider');
    
    btnPlay.disabled = !hasAnimation;
    btnPause.disabled = !hasAnimation;
    btnStop.disabled = !hasAnimation;
    timeSlider.disabled = !hasAnimation;
    
    if (hasAnimation) {
      document.getElementById('btn-export').disabled = false;
      document.getElementById('btn-capture').disabled = false;
    }
  }
  
  resetTimeline() {
    document.getElementById('time-slider').value = 0;
    document.getElementById('current-time').textContent = '00:00:00';
    
    const duration = this.playbackService.getDuration();
    if (duration > 0) {
      document.getElementById('total-time').textContent = this.timelineService.formatTime(duration);
    } else {
      document.getElementById('total-time').textContent = '00:00:00';
    }
  }
  
  updateTimelineUI() {
    if (!this.playbackService.getIsPlaying()) return;
    
    const time = this.playbackService.getCurrentTime();
    const duration = this.playbackService.getDuration();
    
    if (duration > 0) {
      document.getElementById('time-slider').value = time / duration;
      document.getElementById('current-time').textContent = this.timelineService.formatTime(time);
    }
  }
  
  startTimelineUpdate() {
    if (this.timelineUpdateInterval) {
      clearInterval(this.timelineUpdateInterval);
    }
    
    this.timelineUpdateInterval = setInterval(() => {
      if (this.playbackService.getIsPlaying()) {
        this.updateTimelineUI();
      }
    }, 100);
  }
  
  scrubTimeline(value) {
    if (!this.playbackService.hasAction()) return;
    
    const mixer = this.sceneManager.getMixer();
    if (!mixer) return;
    
    const duration = this.playbackService.getDuration();
    const time = value * duration;
    
    // Pause the animation if playing to enable smooth scrubbing
    const wasPlaying = this.playbackService.getIsPlaying();
    if (wasPlaying) {
      this.playbackService.pause();
    }
    
    // Set the animation time
    this.playbackService.setTime(time);
    
    // Update the mixer to apply the new time
    mixer.update(0);
    
    // Update UI
    document.getElementById('current-time').textContent = this.timelineService.formatTime(time);
    
    // Resume playing if it was playing before - but don't reset
    if (wasPlaying) {
      const action = this.playbackService.getCurrentAction();
      if (action) {
        action.paused = false;
        this.playbackService.isPlaying = true;
      }
    }
  }
  
  getCurrentAnimation() {
    return this.collectionService.getAnimation(this.currentAnimationIndex);
  }
  
  getCurrentAction() {
    return this.playbackService.getCurrentAction();
  }
  
  getAnimations() {
    return this.collectionService.getAnimations();
  }
  
  /**
   * Get all animations (same as getAnimations, for clarity)
   */
  getAllAnimations() {
    return this.collectionService.getAnimations();
  }
  
  /**
   * Add new animations to the existing animation list
   * @param {Array} newAnimations - Array of THREE.AnimationClip objects to add
   */
  addAnimations(newAnimations) {
    return this.collectionService.addAnimations(newAnimations);
  }
  
  /**
   * Remove an animation by index
   * @param {number} index - Index of animation to remove
   */
  removeAnimation(index) {
    if (index < 0 || index >= this.collectionService.getAnimationCount()) {
      return this.collectionService.getAnimationCount();
    }
    
    // Get the animation name before removing
    const animation = this.collectionService.getAnimation(index);
    const animationName = animation ? animation.name : `Animation ${index + 1}`;
    
    // If this is the currently playing animation, stop it
    if (index === this.currentAnimationIndex) {
      this.stopAnimation();
      this.currentAnimationIndex = -1;
    } else if (index < this.currentAnimationIndex) {
      // Adjust current index if we're removing an animation before it
      this.currentAnimationIndex--;
    }
    
    // Remove the animation using service
    const removed = this.collectionService.removeAnimation(index);
    
    // Update UI
    this.populateAnimationList();
    this.updatePlaybackButtonsUI();
    
    // Show notification
    if (window.uiManager && removed) {
      window.uiManager.showNotification(
        `Removed animation: ${animationName}`,
        'info'
      );
    }
    
    return this.collectionService.getAnimationCount();
  }
  
  /**
   * Open rename modal for animation
   */
  openRenameModal(index) {
    if (index < 0 || index >= this.collectionService.getAnimationCount()) {
      return;
    }
    
    const clip = this.collectionService.getAnimation(index);
    const modal = document.getElementById('rename-animation-modal');
    const input = document.getElementById('rename-animation-input');
    
    // Set current name
    input.value = clip.name || `Animation ${index + 1}`;
    input.dataset.animationIndex = index;
    
    // Open modal
    modal.classList.add('is-active');
    
    // Focus input after a short delay
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
    
    // Add Enter key listener (remove old one first)
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-confirm-rename-animation').click();
      }
    });
  }
  
  /**
   * Rename animation
   */
  renameAnimation(index, newName) {
    const oldName = this.collectionService.getAnimation(index)?.name || `Animation ${index + 1}`;
    const success = this.collectionService.renameAnimation(index, newName);
    
    if (!success) {
      if (window.uiManager) {
        window.uiManager.showNotification('Animation name cannot be empty', 'warning');
      }
      return false;
    }
    
    // Update UI
    this.populateAnimationList();
    
    // Show notification
    if (window.uiManager) {
      window.uiManager.showNotification(
        `Renamed: "${oldName}" → "${newName.trim()}"`,
        'success'
      );
    }
    
    return true;
  }
  
  /**
   * Check if model has any animations
   */
  hasAnimations() {
    return this.collectionService.hasAnimations();
  }
}
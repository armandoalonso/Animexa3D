import * as THREE from 'three';

export class AnimationManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.animations = [];
    this.currentAction = null;
    this.currentAnimationIndex = -1;
    this.isPlaying = false;
    this.loopEnabled = false;
  }
  
  loadAnimations(animations) {
    this.animations = animations;
    this.currentAction = null;
    this.currentAnimationIndex = -1;
    this.isPlaying = false;
    
    this.populateAnimationList();
    this.updateTimelineUI();
  }
  
  populateAnimationList() {
    const animationList = document.getElementById('animation-list');
    animationList.innerHTML = '';
    
    if (this.animations.length === 0) {
      animationList.innerHTML = '<div class="empty-state"><p class="has-text-grey">No animations found</p></div>';
      return;
    }
    
    this.animations.forEach((clip, index) => {
      const container = document.createElement('div');
      container.className = 'animation-list-item';
      container.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;';
      
      const button = document.createElement('button');
      button.className = 'button is-fullwidth animation-item';
      button.style.cssText = 'flex: 1;';
      button.innerHTML = `
        <div style="text-align: left; width: 100%;">
          <div><strong>${clip.name || `Animation ${index + 1}`}</strong></div>
          <div style="font-size: 0.8rem; opacity: 0.7;">${clip.duration.toFixed(2)}s</div>
        </div>
      `;
      button.onclick = () => this.playAnimation(index);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button is-danger is-small';
      deleteBtn.style.cssText = 'flex-shrink: 0;';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Remove animation';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeAnimation(index);
      };
      
      container.appendChild(button);
      container.appendChild(deleteBtn);
      animationList.appendChild(container);
    });
  }
  
  playAnimation(index) {
    if (index < 0 || index >= this.animations.length) return;
    
    const mixer = this.sceneManager.getMixer();
    if (!mixer) return;
    
    // Stop current action
    if (this.currentAction) {
      this.currentAction.stop();
    }
    
    // Get the clip
    const clip = this.animations[index];
    
    // Create and play action
    this.currentAction = mixer.clipAction(clip);
    this.currentAction.setLoop(
      this.loopEnabled ? THREE.LoopRepeat : THREE.LoopOnce
    );
    this.currentAction.clampWhenFinished = true;
    
    // Listen for animation finished event
    const onFinished = () => {
      if (!this.loopEnabled) {
        this.isPlaying = false;
        this.updatePlaybackButtonsUI();
      }
    };
    
    mixer.addEventListener('finished', onFinished);
    this.currentAction.reset().play();
    
    this.currentAnimationIndex = index;
    this.isPlaying = true;
    
    // Update UI
    this.updateAnimationListUI();
    this.updatePlaybackButtonsUI();
    this.resetTimeline();
    
    // Update timeline in render loop
    this.startTimelineUpdate();
  }
  
  pauseAnimation() {
    if (this.currentAction) {
      this.currentAction.paused = true;
      this.isPlaying = false;
      this.updatePlaybackButtonsUI();
    }
  }
  
  resumeAnimation() {
    if (this.currentAction) {
      // If animation is finished, restart it
      if (!this.currentAction.isRunning()) {
        this.currentAction.reset().play();
      } else {
        this.currentAction.paused = false;
      }
      this.isPlaying = true;
      this.updatePlaybackButtonsUI();
      this.startTimelineUpdate();
    }
  }
  
  stopAnimation() {
    if (this.currentAction) {
      this.currentAction.stop();
      this.isPlaying = false;
      this.resetTimeline();
      this.updatePlaybackButtonsUI();
    }
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pauseAnimation();
    } else if (this.currentAction) {
      // If animation finished, restart it
      if (!this.currentAction.isRunning()) {
        this.currentAction.reset().play();
        this.isPlaying = true;
        this.updatePlaybackButtonsUI();
        this.startTimelineUpdate();
      } else {
        this.resumeAnimation();
      }
    } else if (this.animations.length > 0) {
      this.playAnimation(0);
    }
  }
  
  setLoop(enabled) {
    this.loopEnabled = enabled;
    if (this.currentAction) {
      this.currentAction.setLoop(
        this.loopEnabled ? THREE.LoopRepeat : THREE.LoopOnce
      );
      
      // If switching to loop mode and animation finished, restart it
      if (this.loopEnabled && !this.isPlaying) {
        this.currentAction.reset().play();
        this.isPlaying = true;
        this.updatePlaybackButtonsUI();
        this.startTimelineUpdate();
      }
    }
  }
  
  toggleLoop() {
    this.setLoop(!this.loopEnabled);
  }
  
  changeAnimation(direction) {
    if (this.animations.length === 0) return;
    
    let newIndex = this.currentAnimationIndex + direction;
    if (newIndex < 0) newIndex = this.animations.length - 1;
    if (newIndex >= this.animations.length) newIndex = 0;
    
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
    const hasAnimation = this.animations.length > 0;
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
    
    if (this.currentAction) {
      const duration = this.currentAction.getClip().duration;
      document.getElementById('total-time').textContent = this.formatTime(duration);
    } else {
      document.getElementById('total-time').textContent = '00:00:00';
    }
  }
  
  updateTimelineUI() {
    if (!this.currentAction || !this.isPlaying) return;
    
    const clip = this.currentAction.getClip();
    const time = this.currentAction.time;
    const duration = clip.duration;
    
    document.getElementById('time-slider').value = time / duration;
    document.getElementById('current-time').textContent = this.formatTime(time);
  }
  
  startTimelineUpdate() {
    if (this.timelineUpdateInterval) {
      clearInterval(this.timelineUpdateInterval);
    }
    
    this.timelineUpdateInterval = setInterval(() => {
      if (this.isPlaying && this.currentAction) {
        this.updateTimelineUI();
      }
    }, 100);
  }
  
  scrubTimeline(value) {
    if (!this.currentAction) return;
    
    const mixer = this.sceneManager.getMixer();
    if (!mixer) return;
    
    const duration = this.currentAction.getClip().duration;
    const time = value * duration;
    
    // Pause the animation if playing to enable smooth scrubbing
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.currentAction.paused = true;
    }
    
    // Set the animation time
    this.currentAction.time = time;
    
    // Update the mixer to apply the new time
    mixer.update(0);
    
    // Update UI
    document.getElementById('current-time').textContent = this.formatTime(time);
    
    // Resume playing if it was playing before
    if (wasPlaying) {
      this.currentAction.paused = false;
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24); // Assuming 24fps for display
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
  
  getCurrentAnimation() {
    if (this.currentAnimationIndex >= 0 && this.currentAnimationIndex < this.animations.length) {
      return this.animations[this.currentAnimationIndex];
    }
    return null;
  }
  
  getCurrentAction() {
    return this.currentAction;
  }
  
  getAnimations() {
    return this.animations;
  }
  
  /**
   * Add new animations to the existing animation list
   * @param {Array} newAnimations - Array of THREE.AnimationClip objects to add
   */
  addAnimations(newAnimations) {
    if (!newAnimations || newAnimations.length === 0) {
      return;
    }
    
    // Add new animations to the list
    this.animations.push(...newAnimations);
    
    // Update UI
    this.populateAnimationList();
    this.updatePlaybackButtonsUI();
    
    return this.animations.length;
  }
  
  /**
   * Remove an animation by index
   * @param {number} index - Index of animation to remove
   */
  removeAnimation(index) {
    if (index < 0 || index >= this.animations.length) {
      return;
    }
    
    // If this is the currently playing animation, stop it
    if (index === this.currentAnimationIndex) {
      this.stopAnimation();
      this.currentAnimationIndex = -1;
    } else if (index < this.currentAnimationIndex) {
      // Adjust current index if we're removing an animation before it
      this.currentAnimationIndex--;
    }
    
    // Remove the animation
    const removed = this.animations.splice(index, 1);
    
    // Update UI
    this.populateAnimationList();
    this.updatePlaybackButtonsUI();
    
    // Show notification
    if (window.uiManager) {
      window.uiManager.showNotification(
        `Removed animation: ${removed[0].name || 'Animation ' + (index + 1)}`,
        'info'
      );
    }
    
    return this.animations.length;
  }
  
  /**
   * Check if model has any animations
   */
  hasAnimations() {
    return this.animations && this.animations.length > 0;
  }
}


/**
 * NotificationService
 * 
 * Handles the display, queueing, and lifecycle management of notifications
 * in the application. Provides a testable, DOM-independent implementation
 * that can be injected with dependencies.
 */

export class NotificationService {
  /**
   * @typedef {Object} NotificationOptions
   * @property {string} message - The notification message to display
   * @property {'info' | 'success' | 'warning' | 'error'} [type='info'] - The notification type
   * @property {number} [duration=5000] - Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
   * @property {boolean} [dismissible=true] - Whether the notification can be manually dismissed
   */

  /**
   * @typedef {Object} Notification
   * @property {string} id - Unique notification identifier
   * @property {string} message - The notification message
   * @property {string} type - The notification type
   * @property {number} duration - Auto-dismiss duration
   * @property {boolean} dismissible - Whether it can be dismissed
   * @property {HTMLElement} [element] - The DOM element (if rendered)
   * @property {number} [timeoutId] - The auto-dismiss timeout ID
   */

  constructor(containerSelector = '#notification-container') {
    /**
     * @private
     * @type {string}
     */
    this.containerSelector = containerSelector;

    /**
     * @private
     * @type {Map<string, Notification>}
     */
    this.activeNotifications = new Map();

    /**
     * @private
     * @type {number}
     */
    this.notificationCounter = 0;

    /**
     * @private
     * @type {number}
     */
    this.maxConcurrentNotifications = 5;
  }

  /**
   * Show a notification
   * 
   * @param {string} message - The notification message
   * @param {'info' | 'success' | 'warning' | 'error'} [type='info'] - The notification type
   * @param {number} [duration=5000] - Auto-dismiss duration in milliseconds
   * @returns {string} The notification ID
   */
  showNotification(message, type = 'info', duration = 5000) {
    const id = this.generateId();
    
    const notification = {
      id,
      message,
      type: this.validateType(type),
      duration,
      dismissible: true,
      element: null,
      timeoutId: null
    };

    // Enforce max concurrent BEFORE adding new notification
    if (this.activeNotifications.size >= this.maxConcurrentNotifications) {
      // Remove oldest notification
      const oldestId = this.getActiveNotificationIds()[0];
      this.dismissNotification(oldestId);
    }

    // Add to active notifications
    this.activeNotifications.set(id, notification);

    // Render the notification
    this.renderNotification(notification);

    // Set auto-dismiss if duration > 0
    if (duration > 0) {
      notification.timeoutId = setTimeout(() => {
        this.dismissNotification(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a notification by ID
   * 
   * @param {string} id - The notification ID
   * @returns {boolean} True if notification was dismissed
   */
  dismissNotification(id) {
    const notification = this.activeNotifications.get(id);
    
    if (!notification) {
      return false;
    }

    // Clear timeout if exists
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    // Remove from active notifications immediately to prevent race conditions
    this.activeNotifications.delete(id);

    // Animate out
    if (notification.element) {
      notification.element.style.opacity = '0';
      
      // Remove after animation
      setTimeout(() => {
        if (notification.element && notification.element.parentNode) {
          notification.element.remove();
        }
      }, 300);
    }

    return true;
  }

  /**
   * Dismiss all active notifications
   * 
   * @returns {number} Number of notifications dismissed
   */
  dismissAll() {
    const count = this.activeNotifications.size;
    const ids = Array.from(this.activeNotifications.keys());
    
    ids.forEach(id => this.dismissNotification(id));
    
    return count;
  }

  /**
   * Get all active notification IDs
   * 
   * @returns {string[]} Array of active notification IDs
   */
  getActiveNotificationIds() {
    return Array.from(this.activeNotifications.keys());
  }

  /**
   * Get the number of active notifications
   * 
   * @returns {number} Number of active notifications
   */
  getActiveCount() {
    return this.activeNotifications.size;
  }

  /**
   * Get a notification by ID
   * 
   * @param {string} id - The notification ID
   * @returns {Notification | null} The notification object or null
   */
  getNotification(id) {
    return this.activeNotifications.get(id) || null;
  }

  /**
   * Set the maximum number of concurrent notifications
   * 
   * @param {number} max - Maximum concurrent notifications
   */
  setMaxConcurrent(max) {
    if (max < 1) {
      throw new Error('Max concurrent notifications must be at least 1');
    }
    this.maxConcurrentNotifications = max;
    this.enforceMaxConcurrent();
  }

  /**
   * Get the maximum number of concurrent notifications
   * 
   * @returns {number} Maximum concurrent notifications
   */
  getMaxConcurrent() {
    return this.maxConcurrentNotifications;
  }

  /**
   * @private
   * Generate a unique notification ID
   * 
   * @returns {string} Unique ID
   */
  generateId() {
    this.notificationCounter++;
    return `notification-${Date.now()}-${this.notificationCounter}`;
  }

  /**
   * @private
   * Validate notification type
   * 
   * @param {string} type - The type to validate
   * @returns {string} Valid type
   */
  validateType(type) {
    const validTypes = ['info', 'success', 'warning', 'error'];
    return validTypes.includes(type) ? type : 'info';
  }

  /**
   * @private
   * Enforce maximum concurrent notifications
   */
  enforceMaxConcurrent() {
    while (this.activeNotifications.size > this.maxConcurrentNotifications) {
      // Remove oldest notification
      const oldestId = this.getActiveNotificationIds()[0];
      if (oldestId) {
        this.dismissNotification(oldestId);
      } else {
        break; // Safety check
      }
    }
  }

  /**
   * @private
   * Render a notification to the DOM
   * 
   * @param {Notification} notification - The notification to render
   */
  renderNotification(notification) {
    const container = document.querySelector(this.containerSelector);
    
    if (!container) {
      console.warn(`Notification container "${this.containerSelector}" not found`);
      return;
    }

    const element = document.createElement('div');
    element.className = `notification is-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    
    // Create text node for message (auto-escapes HTML)
    const messageNode = document.createTextNode(notification.message);
    
    element.appendChild(deleteBtn);
    element.appendChild(messageNode);
    
    // Attach to notification object
    notification.element = element;

    // Add delete button handler
    deleteBtn.addEventListener('click', () => {
      this.dismissNotification(notification.id);
    });
    
    // Add to container
    container.appendChild(element);
  }

  /**
   * @private
   * Escape HTML to prevent XSS
   * 
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all notifications and reset state
   * Used primarily for testing
   */
  reset() {
    this.dismissAll();
    this.notificationCounter = 0;
  }
}

/**
 * Create a singleton instance for convenience
 * This can be imported and used directly in modules
 */
export const notificationService = new NotificationService();

/**
 * Convenience function for showing notifications
 * 
 * @param {string} message - The notification message
 * @param {'info' | 'success' | 'warning' | 'error'} [type='info'] - The notification type
 * @param {number} [duration=5000] - Auto-dismiss duration in milliseconds
 * @returns {string} The notification ID
 */
export function showNotification(message, type = 'info', duration = 5000) {
  return notificationService.showNotification(message, type, duration);
}

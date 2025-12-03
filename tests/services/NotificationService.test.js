import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService, showNotification } from '../../src/renderer/modules/services/NotificationService.js';

describe('NotificationService', () => {
  let service;
  let container;

  beforeEach(() => {
    // Create a container element for notifications
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);

    // Create service instance
    service = new NotificationService('#notification-container');
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up
    service.reset();
    document.body.removeChild(container);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create a new NotificationService with default container', () => {
      const defaultService = new NotificationService();
      expect(defaultService.containerSelector).toBe('#notification-container');
    });

    it('should create a new NotificationService with custom container', () => {
      const customService = new NotificationService('#custom-container');
      expect(customService.containerSelector).toBe('#custom-container');
    });

    it('should initialize with empty active notifications', () => {
      expect(service.getActiveCount()).toBe(0);
    });

    it('should initialize with default max concurrent notifications', () => {
      expect(service.getMaxConcurrent()).toBe(5);
    });
  });

  describe('showNotification', () => {
    it('should show a notification with default parameters', () => {
      const id = service.showNotification('Test message');
      
      expect(id).toBeTruthy();
      expect(service.getActiveCount()).toBe(1);
      
      const notification = service.getNotification(id);
      expect(notification.message).toBe('Test message');
      expect(notification.type).toBe('info');
      expect(notification.duration).toBe(5000);
    });

    it('should show a notification with custom type', () => {
      const id = service.showNotification('Success!', 'success');
      
      const notification = service.getNotification(id);
      expect(notification.type).toBe('success');
    });

    it('should show a notification with custom duration', () => {
      const id = service.showNotification('Quick message', 'info', 1000);
      
      const notification = service.getNotification(id);
      expect(notification.duration).toBe(1000);
    });

    it('should show all notification types correctly', () => {
      const types = ['info', 'success', 'warning', 'error'];
      
      types.forEach(type => {
        const id = service.showNotification(`${type} message`, type);
        const notification = service.getNotification(id);
        expect(notification.type).toBe(type);
      });
    });

    it('should default to info type for invalid types', () => {
      const id = service.showNotification('Test', 'invalid-type');
      
      const notification = service.getNotification(id);
      expect(notification.type).toBe('info');
    });

    it('should create a DOM element for the notification', () => {
      service.showNotification('Test message');
      
      const elements = container.querySelectorAll('.notification');
      expect(elements.length).toBe(1);
      expect(elements[0].textContent).toContain('Test message');
    });

    it('should add correct Bulma CSS classes', () => {
      service.showNotification('Test', 'success');
      
      const element = container.querySelector('.notification');
      expect(element.classList.contains('notification')).toBe(true);
      expect(element.classList.contains('is-success')).toBe(true);
    });

    it('should include a delete button', () => {
      service.showNotification('Test');
      
      const deleteBtn = container.querySelector('.delete');
      expect(deleteBtn).toBeTruthy();
    });

    it('should return a unique ID for each notification', () => {
      const id1 = service.showNotification('Message 1');
      const id2 = service.showNotification('Message 2');
      
      expect(id1).not.toBe(id2);
    });

    it('should handle HTML escaping to prevent XSS', () => {
      const maliciousMessage = '<script>alert("XSS")</script>';
      service.showNotification(maliciousMessage);
      
      const element = container.querySelector('.notification');
      
      // The script tag should not be executable
      const scriptTags = element.querySelectorAll('script');
      expect(scriptTags.length).toBe(0);
      
      // But the text should be visible
      expect(element.textContent).toContain('<script>');
      expect(element.textContent).toContain('alert("XSS")');
    });

    it('should not render if container is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create service with non-existent container
      const badService = new NotificationService('#non-existent');
      const id = badService.showNotification('Test');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notification container "#non-existent" not found'
      );
      
      // Should still track the notification
      expect(badService.getActiveCount()).toBe(1);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after the specified duration', () => {
      const id = service.showNotification('Auto-dismiss', 'info', 3000);
      
      expect(service.getActiveCount()).toBe(1);
      
      // Fast-forward time (duration + animation)
      vi.advanceTimersByTime(3000);
      
      // Should be removed from active immediately
      expect(service.getActiveCount()).toBe(0);
    });

    it('should not auto-dismiss if duration is 0', () => {
      const id = service.showNotification('Persistent', 'info', 0);
      
      expect(service.getActiveCount()).toBe(1);
      
      // Fast-forward time
      vi.advanceTimersByTime(10000);
      
      // Should still be active
      expect(service.getActiveCount()).toBe(1);
    });

    it('should handle multiple notifications with different durations', () => {
      service.showNotification('Quick', 'info', 1000);
      service.showNotification('Medium', 'info', 3000);
      service.showNotification('Slow', 'info', 5000);
      
      expect(service.getActiveCount()).toBe(3);
      
      // After 1 second
      vi.advanceTimersByTime(1000);
      expect(service.getActiveCount()).toBe(2);
      
      // After 3 seconds total
      vi.advanceTimersByTime(2000);
      expect(service.getActiveCount()).toBe(1);
      
      // After 5 seconds total
      vi.advanceTimersByTime(2000);
      expect(service.getActiveCount()).toBe(0);
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss a notification by ID', () => {
      const id = service.showNotification('Test', 'info', 0);
      
      expect(service.getActiveCount()).toBe(1);
      
      const result = service.dismissNotification(id);
      
      expect(result).toBe(true);
      
      // Should be removed from active immediately
      expect(service.getActiveCount()).toBe(0);
    });

    it('should return false for non-existent notification', () => {
      const result = service.dismissNotification('non-existent-id');
      expect(result).toBe(false);
    });

    it('should clear the auto-dismiss timeout', () => {
      const id = service.showNotification('Test', 'info', 5000);
      
      service.dismissNotification(id);
      
      // Fast-forward past the original duration
      vi.advanceTimersByTime(10000);
      
      // Should not have been auto-dismissed again
      expect(service.getActiveCount()).toBe(0);
    });

    it('should remove the DOM element after animation', () => {
      const id = service.showNotification('Test');
      
      expect(container.querySelectorAll('.notification').length).toBe(1);
      
      service.dismissNotification(id);
      
      // DOM element should still exist (animating out)
      expect(container.querySelectorAll('.notification').length).toBe(1);
      
      // After animation time
      vi.advanceTimersByTime(300);
      
      expect(container.querySelectorAll('.notification').length).toBe(0);
    });

    it('should handle dismissing a notification without element', () => {
      const id = service.showNotification('Test', 'info', 0);
      
      // Manually remove element but keep in map
      const notification = service.getNotification(id);
      if (notification) {
        notification.element = null;
      }
      
      const result = service.dismissNotification(id);
      
      expect(result).toBe(true);
      expect(service.getActiveCount()).toBe(0);
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all active notifications', () => {
      service.showNotification('Message 1', 'info', 0);
      service.showNotification('Message 2', 'success', 0);
      service.showNotification('Message 3', 'warning', 0);
      
      expect(service.getActiveCount()).toBe(3);
      
      const count = service.dismissAll();
      
      expect(count).toBe(3);
      
      // Should be removed from active immediately
      expect(service.getActiveCount()).toBe(0);
    });

    it('should return 0 if no notifications are active', () => {
      const count = service.dismissAll();
      expect(count).toBe(0);
    });
  });

  describe('getActiveNotificationIds', () => {
    it('should return an array of active notification IDs', () => {
      const id1 = service.showNotification('Message 1');
      const id2 = service.showNotification('Message 2');
      
      const ids = service.getActiveNotificationIds();
      
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids.length).toBe(2);
    });

    it('should return an empty array if no notifications are active', () => {
      const ids = service.getActiveNotificationIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getActiveCount', () => {
    it('should return the correct count of active notifications', () => {
      expect(service.getActiveCount()).toBe(0);
      
      service.showNotification('Message 1');
      expect(service.getActiveCount()).toBe(1);
      
      service.showNotification('Message 2');
      expect(service.getActiveCount()).toBe(2);
      
      service.dismissAll();
      expect(service.getActiveCount()).toBe(0);
    });
  });

  describe('getNotification', () => {
    it('should return a notification by ID', () => {
      const id = service.showNotification('Test message', 'success', 3000);
      
      const notification = service.getNotification(id);
      
      expect(notification).toBeTruthy();
      expect(notification.id).toBe(id);
      expect(notification.message).toBe('Test message');
      expect(notification.type).toBe('success');
      expect(notification.duration).toBe(3000);
    });

    it('should return null for non-existent notification', () => {
      const notification = service.getNotification('non-existent-id');
      expect(notification).toBeNull();
    });
  });

  describe('Max Concurrent Notifications', () => {
    it('should enforce max concurrent notifications limit', () => {
      service.setMaxConcurrent(3);
      
      const id1 = service.showNotification('Message 1', 'info', 0);
      const id2 = service.showNotification('Message 2', 'info', 0);
      const id3 = service.showNotification('Message 3', 'info', 0);
      
      expect(service.getActiveCount()).toBe(3);
      
      // Adding a 4th should dismiss the oldest (id1)
      const id4 = service.showNotification('Message 4', 'info', 0);
      
      expect(service.getActiveCount()).toBe(3);
      
      // id1 should be gone, id2, id3, id4 should remain
      expect(service.getNotification(id1)).toBeNull();
      expect(service.getNotification(id2)).toBeTruthy();
      expect(service.getNotification(id3)).toBeTruthy();
      expect(service.getNotification(id4)).toBeTruthy();
    });

    it('should allow setting max concurrent notifications', () => {
      service.setMaxConcurrent(10);
      expect(service.getMaxConcurrent()).toBe(10);
    });

    it('should throw error for invalid max concurrent value', () => {
      expect(() => service.setMaxConcurrent(0)).toThrow(
        'Max concurrent notifications must be at least 1'
      );
      
      expect(() => service.setMaxConcurrent(-1)).toThrow(
        'Max concurrent notifications must be at least 1'
      );
    });

    it('should immediately enforce new limit when set', () => {
      // Create 5 notifications
      for (let i = 1; i <= 5; i++) {
        service.showNotification(`Message ${i}`, 'info', 0);
      }
      
      expect(service.getActiveCount()).toBe(5);
      
      // Set max to 3
      service.setMaxConcurrent(3);
      
      // Should be removed immediately
      expect(service.getActiveCount()).toBe(3);
    });
  });

  describe('Delete Button Functionality', () => {
    it('should dismiss notification when delete button is clicked', () => {
      service.showNotification('Test message');
      
      const deleteBtn = container.querySelector('.delete');
      deleteBtn.click();
      
      // Should be removed from active immediately
      expect(service.getActiveCount()).toBe(0);
      
      // DOM element should be animating out
      expect(container.querySelectorAll('.notification').length).toBe(1);
      
      vi.advanceTimersByTime(300); // Animation time
      
      expect(container.querySelectorAll('.notification').length).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all notifications and reset counter', () => {
      service.showNotification('Message 1');
      service.showNotification('Message 2');
      
      expect(service.getActiveCount()).toBe(2);
      
      service.reset();
      
      // Should be removed immediately
      expect(service.getActiveCount()).toBe(0);
      expect(service.notificationCounter).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive notifications', () => {
      for (let i = 1; i <= 10; i++) {
        service.showNotification(`Message ${i}`, 'info', 1000);
      }
      
      // Should be capped at max concurrent (5) in active notifications
      expect(service.getActiveCount()).toBe(5);
      
      // DOM elements include those being animated out, so we need to account for that
      // The first 5 were dismissed, but their elements are still in the DOM (animating out)
      // Plus the 5 active ones = 10 total DOM elements initially
      let elements = container.querySelectorAll('.notification');
      expect(elements.length).toBeGreaterThanOrEqual(5);
      
      // After animation completes, only 5 should remain
      vi.advanceTimersByTime(300);
      elements = container.querySelectorAll('.notification');
      expect(elements.length).toBe(5);
    });

    it('should handle mixed auto-dismiss and persistent notifications', () => {
      service.showNotification('Auto 1', 'info', 1000);
      service.showNotification('Persistent', 'warning', 0);
      service.showNotification('Auto 2', 'success', 2000);
      
      expect(service.getActiveCount()).toBe(3);
      
      vi.advanceTimersByTime(1000);
      expect(service.getActiveCount()).toBe(2);
      
      vi.advanceTimersByTime(1000);
      expect(service.getActiveCount()).toBe(1);
      
      // Persistent should still be there
      const remaining = service.getActiveNotificationIds();
      const notification = service.getNotification(remaining[0]);
      expect(notification.message).toBe('Persistent');
    });

    it('should properly clean up when notifications overlap', () => {
      const id1 = service.showNotification('Message 1', 'info', 2000);
      
      vi.advanceTimersByTime(1000);
      
      const id2 = service.showNotification('Message 2', 'info', 2000);
      
      vi.advanceTimersByTime(1000);
      
      // id1 should be dismissed, id2 still active
      expect(service.getActiveCount()).toBe(1);
      expect(service.getNotification(id2)).toBeTruthy();
    });
  });

  describe('Convenience Functions', () => {
    it('should export a convenience showNotification function', () => {
      expect(showNotification).toBeDefined();
      expect(typeof showNotification).toBe('function');
    });

    it('should use the singleton instance', () => {
      // This test verifies the convenience function works
      // In a real DOM environment, this would show a notification
      const id = showNotification('Test from convenience function', 'info', 1000);
      expect(id).toBeTruthy();
    });
  });
});

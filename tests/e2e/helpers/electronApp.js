/**
 * Electron App Helper for E2E Tests
 * Handles launching and closing the Electron application
 */

import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the Electron app for testing
 * @returns {Promise<{app, window}>} Electron app and main window
 */
export async function launchApp() {
  // Path to the main entry point - need to build first
  const electronPath = path.resolve(__dirname, '../../../node_modules/.bin/electron');
  const appPath = path.resolve(__dirname, '../../../');
  
  // Launch Electron app
  const app = await electron.launch({
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Wait for the first window to open
  const window = await app.firstWindow();
  
  // Wait for the page to be fully loaded
  await window.waitForLoadState('domcontentloaded');
  
  return { app, window };
}

/**
 * Close the Electron app
 * @param {ElectronApplication} app - The Electron app instance
 */
export async function closeApp(app) {
  if (app) {
    await app.close();
  }
}

/**
 * Wait for an element to be visible
 * @param {Page} window - The Playwright page/window
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 */
export async function waitForElement(window, selector, timeout = 5000) {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Click a button by ID
 * @param {Page} window - The Playwright page/window
 * @param {string} buttonId - The button's ID
 */
export async function clickButton(window, buttonId) {
  await window.click(`#${buttonId}`);
}

/**
 * Take a screenshot for debugging
 * @param {Page} window - The Playwright page/window
 * @param {string} filename - Screenshot filename
 */
export async function takeScreenshot(window, filename) {
  await window.screenshot({ path: filename });
}

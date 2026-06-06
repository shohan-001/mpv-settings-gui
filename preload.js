const { contextBridge, ipcRenderer } = require('electron');
const settingsData = require('./src/settings-data.js');
const configParser = require('./src/config-parser.js');
const inputParser = require('./src/input-parser.js');

contextBridge.exposeInMainWorld('mpvConfig', {
  // ── Config file operations ────────────────────────────────────────────────

  /**
   * Read the contents of mpv.conf
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  readConfig: () => ipcRenderer.invoke('read-config'),

  /**
   * Write content to mpv.conf (automatically creates a timestamped backup)
   * @param {string} content - The config content to write
   * @returns {Promise<{success: boolean, backup?: string, error?: string}>}
   */
  writeConfig: (content) => ipcRenderer.invoke('write-config', content),

  /**
   * Read the contents of input.conf
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  readInputConfig: () => ipcRenderer.invoke('read-input-config'),

  /**
   * Write content to input.conf (automatically creates a timestamped backup)
   * @param {string} content - The input config content to write
   * @returns {Promise<{success: boolean, backup?: string, error?: string}>}
   */
  writeInputConfig: (content) => ipcRenderer.invoke('write-input-config', content),

  // ── Backup operations ─────────────────────────────────────────────────────

  /**
   * List all available backups sorted by date (newest first)
   * @returns {Promise<{success: boolean, backups?: Array, error?: string}>}
   */
  getBackups: () => ipcRenderer.invoke('get-backups'),

  /**
   * Restore a backup file (backs up current config before restoring)
   * @param {string} filename - The backup filename to restore
   * @returns {Promise<{success: boolean, content?: string, restoredTo?: string, error?: string}>}
   */
  restoreBackup: (filename) => ipcRenderer.invoke('restore-backup', filename),

  // ── MPV operations ────────────────────────────────────────────────────────

  /**
   * Launch mpv with the given arguments
   * @param {string[]} args - Command-line arguments for mpv
   * @returns {Promise<{success: boolean, pid?: number, error?: string}>}
   */
  launchMpv: (args) => ipcRenderer.invoke('launch-mpv', args),

  // ── Dialog operations ─────────────────────────────────────────────────────

  /**
   * Open a native directory picker dialog
   * @returns {Promise<{success: boolean, path?: string, canceled?: boolean}>}
   */
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  /**
   * Open a native file picker dialog
   * @param {object} [options] - Optional dialog options
   * @param {string} [options.title] - Dialog title
   * @param {Array} [options.filters] - File type filters
   * @returns {Promise<{success: boolean, path?: string, canceled?: boolean}>}
   */
  selectFile: (options) => ipcRenderer.invoke('select-file', options),

  // ── System information ────────────────────────────────────────────────────

  /**
   * Get system information (GPU, display, audio, mpv version, etc.)
   * @returns {Promise<{success: boolean, info?: object, error?: string}>}
   */
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // ── Generic file operations ───────────────────────────────────────────────

  /**
   * Read an arbitrary file
   * @param {string} filePath - Absolute path to the file
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  /**
   * Write an arbitrary file (with auto-backup if it exists)
   * @param {string} filePath - Absolute path to the file
   * @param {string} content - Content to write
   * @returns {Promise<{success: boolean, backup?: string, error?: string}>}
   */
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  /**
   * Read directory contents
   * @param {string} dirPath - Absolute path to the directory
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

  /**
   * Check if a file or directory exists
   * @param {string} filePath - Path to check
   * @returns {Promise<{exists: boolean}>}
   */
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  /**
   * Create a directory (recursively)
   * @param {string} dirPath - Path to create
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),

  /**
   * Get the config file paths used by the application
   * @returns {Promise<{mpvDir: string, mpvConf: string, inputConf: string, backupDir: string}>}
   */
  getConfigPaths: () => ipcRenderer.invoke('get-config-paths'),

  /**
   * Check for application updates on GitHub releases
   * @returns {Promise<{success: boolean, latestVersion?: string, releaseUrl?: string, error?: string}>}
   */
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  /**
   * Open an external URL in the default browser
   * @param {string} url - The URL to open
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ── Menu event listeners ──────────────────────────────────────────────────


  /**
   * Register a callback for menu-triggered save events
   * @param {Function} callback
   */
  onMenuSave: (callback) => {
    ipcRenderer.on('menu-save', () => callback());
  },

  /**
   * Register a callback for menu-triggered reload events
   * @param {Function} callback
   */
  onMenuReload: (callback) => {
    ipcRenderer.on('menu-reload', () => callback());
  },
});

contextBridge.exposeInMainWorld('mpvSettingsData', settingsData);
contextBridge.exposeInMainWorld('mpvConfigParser', configParser);
contextBridge.exposeInMainWorld('mpvInputParser', inputParser);

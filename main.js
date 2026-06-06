const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const os = require('os');

// ── Config paths ──────────────────────────────────────────────────────────────
const MPV_DIR = path.join(os.homedir(), '.config', 'mpv');
const MPV_CONF = path.join(MPV_DIR, 'mpv.conf');
const INPUT_CONF = path.join(MPV_DIR, 'input.conf');
const BACKUP_DIR = path.join(MPV_DIR, 'backups');

let mainWindow = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createTimestampedBackup(filePath) {
  if (!fs.existsSync(filePath)) return null;

  ensureDir(BACKUP_DIR);

  const basename = path.basename(filePath);
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  const backupName = `${basename}.${ts}.bak`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(filePath, backupPath);
  return backupName;
}

function safeReadFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

function safeWriteFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ── System info helpers ───────────────────────────────────────────────────────

function execSafe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

function getGpuInfo() {
  // Try lspci first
  let info = execSafe("lspci | grep -iE 'vga|3d|display' | head -5");
  if (info) return info;

  // Try glxinfo
  info = execSafe("glxinfo 2>/dev/null | grep -i 'opengl renderer' | head -1");
  if (info) return info;

  return 'Unable to detect GPU';
}

function getDisplayInfo() {
  // Try xrandr
  let info = execSafe("xrandr --current 2>/dev/null | grep ' connected' | head -5");
  if (info) return info;

  // Try wayland
  info = execSafe("wlr-randr 2>/dev/null | head -10");
  if (info) return info;

  // Try swaymsg
  info = execSafe("swaymsg -t get_outputs 2>/dev/null | head -20");
  if (info) return info;

  return 'Unable to detect display info';
}

function getAudioInfo() {
  // Try pactl
  let info = execSafe("pactl list sinks short 2>/dev/null");
  if (info) return info;

  // Try pipewire
  info = execSafe("pw-cli list-objects 2>/dev/null | grep -i 'audio' | head -10");
  if (info) return info;

  // Try aplay
  info = execSafe("aplay -l 2>/dev/null | head -10");
  if (info) return info;

  return 'Unable to detect audio devices';
}

// ── Window creation ───────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f0f17',
    title: 'MPV Settings Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Menu ──────────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save');
            }
          },
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-reload');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About MPV Settings Manager',
              message: 'MPV Settings Manager',
              detail:
                'A graphical configuration manager for mpv media player.\n\n' +
                `Version: 1.0.0\n` +
                `Electron: ${process.versions.electron}\n` +
                `Node.js: ${process.versions.node}\n` +
                `Chromium: ${process.versions.chrome}\n` +
                `Platform: ${process.platform} ${process.arch}`,
            });
          },
        },
        { type: 'separator' },
        {
          label: 'MPV Documentation',
          click: () => {
            shell.openExternal('https://mpv.io/manual/stable/');
          },
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // ─ Read file ─
  ipcMain.handle('read-file', async (_event, filePath) => {
    try {
      const content = safeReadFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Write file (with auto-backup) ─
  ipcMain.handle('write-file', async (_event, filePath, content) => {
    try {
      const backupName = createTimestampedBackup(filePath);
      safeWriteFile(filePath, content);
      return { success: true, backup: backupName };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Read mpv.conf ─
  ipcMain.handle('read-config', async () => {
    try {
      const content = safeReadFile(MPV_CONF);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Write mpv.conf ─
  ipcMain.handle('write-config', async (_event, content) => {
    try {
      const backupName = createTimestampedBackup(MPV_CONF);
      safeWriteFile(MPV_CONF, content);
      return { success: true, backup: backupName };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Read input.conf ─
  ipcMain.handle('read-input-config', async () => {
    try {
      const content = safeReadFile(INPUT_CONF);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Write input.conf ─
  ipcMain.handle('write-input-config', async (_event, content) => {
    try {
      const backupName = createTimestampedBackup(INPUT_CONF);
      safeWriteFile(INPUT_CONF, content);
      return { success: true, backup: backupName };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Read directory ─
  ipcMain.handle('read-directory', async (_event, dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: true, files: [] };
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name),
      }));
      return { success: true, files };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Check file exists ─
  ipcMain.handle('file-exists', async (_event, filePath) => {
    return { exists: fs.existsSync(filePath) };
  });

  // ─ Create directory ─
  ipcMain.handle('create-directory', async (_event, dirPath) => {
    try {
      ensureDir(dirPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Get backups ─
  ipcMain.handle('get-backups', async () => {
    try {
      ensureDir(BACKUP_DIR);
      const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
      const backups = entries
        .filter((e) => e.isFile() && e.name.endsWith('.bak'))
        .map((e) => {
          const stat = fs.statSync(path.join(BACKUP_DIR, e.name));
          return {
            name: e.name,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            path: path.join(BACKUP_DIR, e.name),
          };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));
      return { success: true, backups };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Restore backup ─
  ipcMain.handle('restore-backup', async (_event, backupFilename) => {
    try {
      const backupPath = path.join(BACKUP_DIR, backupFilename);

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // Determine original file from backup name
      let targetPath;
      if (backupFilename.startsWith('mpv.conf.')) {
        targetPath = MPV_CONF;
      } else if (backupFilename.startsWith('input.conf.')) {
        targetPath = INPUT_CONF;
      } else {
        return { success: false, error: 'Unknown backup type' };
      }

      // Create backup of current before restoring
      createTimestampedBackup(targetPath);

      const content = fs.readFileSync(backupPath, 'utf-8');
      fs.writeFileSync(targetPath, content, 'utf-8');

      return { success: true, content, restoredTo: targetPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Launch MPV ─
  ipcMain.handle('launch-mpv', async (_event, args) => {
    try {
      const mpvArgs = Array.isArray(args) ? args : [];
      const child = spawn('mpv', mpvArgs, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { success: true, pid: child.pid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Get system info ─
  ipcMain.handle('get-system-info', async () => {
    try {
      const gpu = getGpuInfo();
      const display = getDisplayInfo();
      const audio = getAudioInfo();

      // Try to get mpv version
      let mpvVersion = execSafe('mpv --version 2>/dev/null | head -1');

      return {
        success: true,
        info: {
          gpu,
          display,
          audio,
          mpvVersion: mpvVersion || 'mpv not found',
          platform: `${os.type()} ${os.release()} (${os.arch()})`,
          hostname: os.hostname(),
          cpus: os.cpus().length,
          memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Select directory dialog ─
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0] };
  });

  // ─ Select file dialog ─
  ipcMain.handle('select-file', async (_event, options) => {
    const dialogOptions = {
      properties: (options && options.properties) || ['openFile'],
      title: (options && options.title) || 'Select File',
    };

    if (options && options.filters) {
      dialogOptions.filters = options.filters;
    }

    const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0], paths: result.filePaths };
  });

  // ─ Get config paths ─
  ipcMain.handle('get-config-paths', async () => {
    return {
      mpvDir: MPV_DIR,
      mpvConf: MPV_CONF,
      inputConf: INPUT_CONF,
      backupDir: BACKUP_DIR,
    };
  });

  // ─ Check for updates ─
  ipcMain.handle('check-for-updates', async () => {
    try {
      const response = await fetch('https://api.github.com/repos/shohan-001/mpv-settings-gui/releases/latest', {
        headers: { 'User-Agent': 'MPV-Settings-GUI-App' }
      });
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      const data = await response.json();
      return {
        success: true,
        latestVersion: data.tag_name,
        releaseUrl: data.html_url,
        releaseNotes: data.body,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─ Open external URL ─
  ipcMain.handle('open-external', async (_event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}


// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  ensureDir(MPV_DIR);
  registerIpcHandlers();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

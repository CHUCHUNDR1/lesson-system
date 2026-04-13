const { app, BrowserWindow, shell, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

let backendInstance = null;
let mainWindow = null;
const earlyLogPath = path.join(os.tmpdir(), 'lesson-system-desktop.log');

app.disableHardwareAcceleration();

function formatError(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function getLogPath() {
  try {
    return path.join(app.getPath('userData'), 'lesson-system-desktop.log');
  } catch {
    return earlyLogPath;
  }
}

function logLine(message, error) {
  const line = `[${new Date().toISOString()}] ${message}${error ? `\n${formatError(error)}` : ''}\n`;
  const logPaths = new Set([earlyLogPath, getLogPath()]);

  for (const logPath of logPaths) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, line, 'utf8');
    } catch {
      // ignore logging failures
    }
  }
}

function showStartupError(error) {
  logLine('Startup error', error);

  const detail =
    `${formatError(error)}\n\nLog: ${getLogPath()}`;

  try {
    dialog.showErrorBox(
      'Lesson System',
      `Не удалось запустить desktop-версию приложения.\n\n${detail}`,
    );
  } catch {
    // ignore UI failures during shutdown
  }
}

function getAppRoot() {
  return app.getAppPath();
}

function createWindow(targetUrl) {
  const baseOrigin = new URL(targetUrl).origin;
  const browserWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    title: 'Lesson System',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(baseOrigin)) {
      createWindow(url);
      return { action: 'deny' };
    }

    void shell.openExternal(url);
    return { action: 'deny' };
  });

  browserWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logLine(
      `Window failed to load: ${validatedURL} (${errorCode}) ${errorDescription}`,
    );
  });

  void browserWindow.loadURL(targetUrl);
  return browserWindow;
}

async function tryBootstrapBackend(host, port) {
  process.env.LESSON_SYSTEM_DB_DRIVER = 'sqljs';
  process.env.LESSON_SYSTEM_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.LESSON_SYSTEM_WEB_DIST = path.join(getAppRoot(), 'frontend', 'dist');

  const backendEntry = path.join(getAppRoot(), 'backend', 'dist', 'main.js');
  const { bootstrap } = require(backendEntry);

  logLine(`Trying backend bootstrap on ${host}:${port}`);
  const instance = await bootstrap({ host, port });
  logLine(`Backend started on ${host}:${instance.port}`);
  return instance;
}

async function startEmbeddedBackend() {
  const preferredPort = Number(process.env.PORT || '3000');
  const attempts = [
    { host: '0.0.0.0', port: preferredPort },
    { host: '127.0.0.1', port: preferredPort },
    { host: '127.0.0.1', port: 0 },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      backendInstance = await tryBootstrapBackend(attempt.host, attempt.port);
      return `http://127.0.0.1:${backendInstance.port}/teacher`;
    } catch (error) {
      lastError = error;
      logLine(`Backend bootstrap failed on ${attempt.host}:${attempt.port}`, error);
    }
  }

  throw lastError || new Error('Backend bootstrap failed');
}

async function createMainWindow() {
  const targetUrl = process.env.ELECTRON_START_URL || (await startEmbeddedBackend());
  logLine(`Opening window at ${targetUrl}`);
  mainWindow = createWindow(targetUrl);
}

app.whenReady().then(() => {
  void createMainWindow().catch(async (error) => {
    showStartupError(error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendInstance?.app) {
    void backendInstance.app.close();
  }
});

process.on('uncaughtException', (error) => {
  showStartupError(error);
});

process.on('unhandledRejection', (error) => {
  showStartupError(error);
});

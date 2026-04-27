const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { fork } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const APP_TITLE = 'Lesson System';

let backendProcess = null;
let mainWindow = null;
let backendUrl = null;
let backendLanUrls = [];
let backendLogFile = null;
const backendOutput = [];
let isQuitting = false;

function getBackendEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  }

  return path.join(__dirname, '..', 'backend', 'dist', 'main.js');
}

function getRendererEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
  }

  return path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
}

function getWindowIcon() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '..', 'build', 'icon.png');

  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function getAvailablePort(preferredPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    const listenOnFreePort = () => {
      const fallback = net.createServer();
      fallback.unref();
      fallback.on('error', reject);
      fallback.listen(0, '0.0.0.0', () => {
        const address = fallback.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        fallback.close(() => resolve(port));
      });
    };

    server.unref();
    server.on('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        listenOnFreePort();
        return;
      }
      reject(error);
    });
    server.listen(preferredPort, '0.0.0.0', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function getLanUrls(port) {
  const urls = [];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`);
      }
    }
  }

  return urls;
}

function waitForBackend(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`${url}/api/session`, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Backend did not become ready in time.'));
          return;
        }
        setTimeout(check, 250);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    check();
  });
}

async function startBackend() {
  const port = await getAvailablePort();
  const serverUrl = `http://127.0.0.1:${port}`;
  const userDataDir = app.getPath('userData');
  const dataDir = path.join(userDataDir, 'data');
  const backendEntry = getBackendEntry();
  const frontendDir = getRendererEntry().replace(/[\\/]index\.html$/, '');

  fs.mkdirSync(dataDir, { recursive: true });
  backendLogFile = path.join(userDataDir, 'backend.log');
  fs.writeFileSync(backendLogFile, '');

  if (!fs.existsSync(backendEntry)) {
    throw new Error(`Backend entry was not found: ${backendEntry}`);
  }

  backendProcess = fork(backendEntry, [], {
    cwd: userDataDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: String(port),
      DB_TYPE: 'sqljs',
      LESSON_DATA_DIR: dataDir,
      LESSON_FRONTEND_DIR: frontendDir,
    },
    execPath: process.execPath,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const rememberBackendOutput = (source, chunk) => {
    const message = `[backend:${source}] ${chunk.toString().trim()}`;
    backendOutput.push(message);
    if (backendOutput.length > 40) backendOutput.shift();
    if (backendLogFile) fs.appendFileSync(backendLogFile, `${message}\n`);
    if (source === 'stderr') {
      console.error(message);
    } else {
      console.log(message);
    }
  };

  backendProcess.stdout?.on('data', (chunk) => rememberBackendOutput('stdout', chunk));
  backendProcess.stderr?.on('data', (chunk) => rememberBackendOutput('stderr', chunk));

  backendProcess.on('exit', (code) => {
    backendProcess = null;
    if (!isQuitting) {
      const lastLines = backendOutput.slice(-10).join('\n');
      const logHint = backendLogFile ? `\n\nLog: ${backendLogFile}` : '';
      dialog.showErrorBox(
        `${APP_TITLE}: backend stopped`,
        `The local backend process stopped unexpectedly with code ${code ?? 'unknown'}.${
          lastLines ? `\n\n${lastLines}` : ''
        }${logHint}`,
      );
      mainWindow?.close();
    }
  });

  await waitForBackend(serverUrl);
  backendUrl = serverUrl;
  backendLanUrls = getLanUrls(port);
  return serverUrl;
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: APP_TITLE,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow(serverUrl) {
  const preload = path.join(__dirname, 'preload.cjs');
  const icon = getWindowIcon();

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: APP_TITLE,
    backgroundColor: '#0f172a',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [
        `--lesson-api-url=${serverUrl}/api`,
        `--lesson-server-url=${serverUrl}`,
        `--lesson-lan-urls=${backendLanUrls.join(',')}`,
      ],
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadFile(getRendererEntry());
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopBackend();
  });

  app.whenReady().then(async () => {
    try {
      buildMenu();
      const serverUrl = await startBackend();
      await createWindow(serverUrl);
    } catch (error) {
      dialog.showErrorBox(
        `${APP_TITLE}: startup failed`,
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
    }
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0 && backendProcess && backendUrl) {
      await createWindow(backendUrl);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

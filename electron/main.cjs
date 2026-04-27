const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const { fork } = require('node:child_process');
const crypto = require('node:crypto');
const dgram = require('node:dgram');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const APP_TITLE = 'Lesson System';
const DISCOVERY_PORT = 45843;
const DISCOVERY_TYPE = 'lesson-system.server';

let backendProcess = null;
let mainWindow = null;
let backendUrl = null;
let backendLanUrls = [];
let backendLogFile = null;
let discoverySocket = null;
let discoveryTimer = null;
let discoveryCleanupTimer = null;
let serverId = null;
const backendOutput = [];
const discoveredServers = new Map();
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

function getServerId() {
  if (serverId) return serverId;

  const userDataDir = app.getPath('userData');
  const serverIdFile = path.join(userDataDir, 'server-id');
  try {
    serverId = fs.existsSync(serverIdFile)
      ? fs.readFileSync(serverIdFile, 'utf8').trim()
      : '';
    if (!serverId) {
      serverId = crypto.randomUUID();
      fs.writeFileSync(serverIdFile, serverId);
    }
  } catch {
    serverId = crypto.randomUUID();
  }

  return serverId;
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

function getPrimaryUrlFromAdvertisement(advertisement, rinfo) {
  const remoteUrl = `http://${rinfo.address}:${advertisement.port}`;
  const urls = Array.isArray(advertisement.urls) ? advertisement.urls : [];
  return urls.find((url) => typeof url === 'string' && !url.includes('127.0.0.1')) ?? remoteUrl;
}

function getDiscoveredServers() {
  return [...discoveredServers.values()]
    .filter((server) => Date.now() - server.lastSeen < 10000)
    .sort((a, b) => Number(b.hasSession) - Number(a.hasSession));
}

function publishDiscoveredServers() {
  const servers = getDiscoveredServers();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('lesson-system:discovered-servers', servers);
  }
}

function readOwnSession() {
  if (!backendUrl) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const req = http.get(`${backendUrl}/api/session`, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(raw ? JSON.parse(raw) : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function broadcastDiscovery() {
  if (!discoverySocket || !backendUrl) return;

  const session = await readOwnSession();
  const advertisement = {
    type: DISCOVERY_TYPE,
    version: 1,
    id: getServerId(),
    name: os.hostname(),
    port: Number(new URL(backendUrl).port),
    urls: backendLanUrls,
    hasSession: Boolean(session),
    sessionTitle: session?.title ?? null,
    sentAt: Date.now(),
  };
  const payload = Buffer.from(JSON.stringify(advertisement));

  try {
    discoverySocket.setBroadcast(true);
    discoverySocket.send(payload, DISCOVERY_PORT, '255.255.255.255');
  } catch (error) {
    console.error('[discovery] broadcast failed', error);
  }
}

function startDiscovery() {
  if (discoverySocket) return;

  discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  discoverySocket.on('error', (error) => {
    console.error('[discovery] socket error', error);
  });

  discoverySocket.on('message', (message, rinfo) => {
    let advertisement;
    try {
      advertisement = JSON.parse(message.toString('utf8'));
    } catch {
      return;
    }

    if (
      advertisement?.type !== DISCOVERY_TYPE ||
      advertisement.id === getServerId() ||
      typeof advertisement.port !== 'number'
    ) {
      return;
    }

    const url = getPrimaryUrlFromAdvertisement(advertisement, rinfo);
    discoveredServers.set(advertisement.id, {
      id: advertisement.id,
      name: advertisement.name || rinfo.address,
      url,
      urls: Array.isArray(advertisement.urls) ? advertisement.urls : [url],
      hasSession: Boolean(advertisement.hasSession),
      sessionTitle: advertisement.sessionTitle || null,
      lastSeen: Date.now(),
    });
    publishDiscoveredServers();
  });

  discoverySocket.bind(DISCOVERY_PORT, () => {
    discoverySocket.setBroadcast(true);
  });

  discoveryTimer = setInterval(() => {
    void broadcastDiscovery();
  }, 1500);
  discoveryCleanupTimer = setInterval(() => {
    let changed = false;
    for (const [id, server] of discoveredServers.entries()) {
      if (Date.now() - server.lastSeen > 10000) {
        discoveredServers.delete(id);
        changed = true;
      }
    }
    if (changed) publishDiscoveredServers();
  }, 3000);
  void broadcastDiscovery();
}

function stopDiscovery() {
  if (discoveryTimer) {
    clearInterval(discoveryTimer);
    discoveryTimer = null;
  }
  if (discoveryCleanupTimer) {
    clearInterval(discoveryCleanupTimer);
    discoveryCleanupTimer = null;
  }
  if (discoverySocket) {
    discoverySocket.close();
    discoverySocket = null;
  }
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
  startDiscovery();
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

  mainWindow.webContents.once('did-finish-load', () => {
    publishDiscoveredServers();
  });

  await mainWindow.loadFile(getRendererEntry());
}

function stopBackend() {
  stopDiscovery();
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  ipcMain.handle('lesson-system:get-discovered-servers', () => getDiscoveredServers());

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

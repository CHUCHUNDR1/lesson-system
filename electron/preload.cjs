const { contextBridge, ipcRenderer } = require('electron');

function readArgument(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

contextBridge.exposeInMainWorld('lessonSystem', {
  apiUrl: readArgument('--lesson-api-url'),
  getDiscoveredServers: () => ipcRenderer.invoke('lesson-system:get-discovered-servers'),
  isDesktop: true,
  lanUrls: (readArgument('--lesson-lan-urls') || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  onDiscoveredServersChanged: (callback) => {
    const listener = (_event, servers) => callback(servers);
    ipcRenderer.on('lesson-system:discovered-servers', listener);
    return () => ipcRenderer.removeListener('lesson-system:discovered-servers', listener);
  },
  platform: process.platform,
  serverUrl: readArgument('--lesson-server-url'),
});

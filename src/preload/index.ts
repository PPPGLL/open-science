import { contextBridge, ipcRenderer, webUtils } from 'electron'

import { unwrapApplicationCommandOutcome } from '../shared/application-command-contract'
import { announceWindowFindReady, subscribeCloseActivePane } from '../shared/window-controls'
import { createElectronRendererApi } from './electron-renderer-api'
import { createElectronRendererContractAdapter } from './electron-renderer-contract-adapter'

const electronRendererContracts = createElectronRendererContractAdapter({
  invoke: (channel, ...args) => {
    const pending = ipcRenderer.invoke(channel, ...args)
    if (/^(acp:|sessions:|preview-state:)/.test(channel)) {
      const started = Date.now()
      console.info('[quit-diag] invoke-start', channel, started)
      void pending.then(
        () => console.info('[quit-diag] invoke-end', channel, Date.now() - started),
        () => console.info('[quit-diag] invoke-failed', channel, Date.now() - started)
      )
    }
    return pending
  },
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  getPathForFile: (file) => webUtils.getPathForFile(file as File)
})

// Ordinary request, send, and subscription wrappers project directly from the typed renderer
// contract. These overrides are the only Electron behaviors that are not described by those three
// dispatch policies: process values, one transitional outcome envelope, and lifecycle handshakes.
const api = createElectronRendererApi(electronRendererContracts, {
  platform: process.platform,
  getRuntimeVersions: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),
  'sessions.saveSession': async (session, options) =>
    unwrapApplicationCommandOutcome(
      await electronRendererContracts.invoke('sessions.saveSession', session, options)
    ),
  'remoteAccess.onChanged': (listener) =>
    electronRendererContracts.subscribe('remoteAccess.onChanged', () => (listener as () => void)()),
  'window.onCloseActivePane': (listener) =>
    subscribeCloseActivePane(
      {
        on: (channel, paneListener) => {
          ipcRenderer.on(channel, paneListener)
          return () => ipcRenderer.removeListener(channel, paneListener)
        },
        send: (channel) => ipcRenderer.send(channel)
      },
      listener
    ),
  'window.announceWindowFindReady': () =>
    announceWindowFindReady({ send: (channel) => ipcRenderer.send(channel) })
})

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (declared in renderer-api.d.ts)
  window.api = api
}

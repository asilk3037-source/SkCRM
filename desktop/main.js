const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const userConfigPath = path.join(app.getPath('userData'), 'config.json')
const bundledConfigPath = path.join(__dirname, 'config.json')

function readConfig() {
  const source = fs.existsSync(userConfigPath) ? userConfigPath : bundledConfigPath
  try {
    return JSON.parse(fs.readFileSync(source, 'utf-8'))
  } catch {
    return { url: 'http://localhost:5173' }
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(userConfigPath), { recursive: true })
  fs.writeFileSync(userConfigPath, JSON.stringify(config, null, 2))
}

let mainWindow
let settingsWindow

function loadApp(win) {
  const { url } = readConfig()
  win.loadURL(url)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'SkCRM',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  loadApp(mainWindow)

  // Any link the web app opens in a new tab should open in the system
  // browser instead of a bare Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return // aborted, e.g. navigating away quickly
    const { url } = readConfig()
    mainWindow.loadURL(
      `data:text/html,${encodeURIComponent(`
        <body style="font-family: system-ui; text-align: center; padding-top: 15vh; color: #334155;">
          <h2>Não foi possível conectar ao SkCRM</h2>
          <p>${errorDescription} (${url})</p>
          <p>Verifique sua internet ou o endereço do servidor em "Arquivo &gt; Configurar servidor".</p>
        </body>
      `)}`,
    )
  })
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 480,
    height: 220,
    parent: mainWindow,
    modal: true,
    resizable: false,
    title: 'Configurar servidor',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'settings-preload.js'),
    },
  })
  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'))
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

ipcMain.handle('settings:get', () => readConfig())

ipcMain.handle('settings:save', (_event, config) => {
  writeConfig(config)
  settingsWindow?.close()
  if (mainWindow) loadApp(mainWindow)
  return true
})

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Arquivo',
        submenu: [
          { label: 'Configurar servidor...', click: createSettingsWindow },
          { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
          { type: 'separator' },
          { role: 'quit', label: 'Sair' },
        ],
      },
      { role: 'editMenu', label: 'Editar' },
      { role: 'viewMenu', label: 'Ver' },
    ]),
  )
}

app.whenReady().then(() => {
  buildMenu()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, screen } = require('electron');
const path = require('path');
const { setRunKey } = require('./src/startup');

const I18N = {
  id: {
    openApp: 'Buka Aplikasi',
    hide: 'Sembunyikan',
    testNotif: 'Tes Notifikasi',
    exit: 'Keluar',
  },
  en: {
    openApp: 'Open Application',
    hide: 'Hide',
    testNotif: 'Test Notification',
    exit: 'Exit',
  },
};

// Helper nama sholat untuk tes notifikasi
const PRAYER_NAMES = {
  id: { fajr: 'Subuh', sunrise: 'Syuruq', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: "Isya'" },
  en: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
};

const PRAYER_ARABIC = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

let mainWindow;
let tray;
let adhanWindow;
let hintWindow;
let hintHoverActive = false;
let hintData = {
  title: 'Sholat Reminder',
  body: 'Gerakkan kursor ke bagian atas layar untuk melihat info sholat berikutnya.',
};
let isQuitting = false;

// ── Pastikan hanya satu instance yang jalan ──
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

function getIcon(filename) {
  return nativeImage.createFromPath(path.join(__dirname, 'assets', filename));
}

function createWindow() {
  const icon = getIcon('icon.png');

  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0d12',
    skipTaskbar: false,
    // Disable fullscreen/maximize so double-click titlebar can't fullscreen.
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js'),
    },
    icon,
    show: false,
    center: true,
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents?.send('app-hidden', { hidden: false });
  });

  // Hard-disable fullscreen: if Windows/Electron triggers it anyway, revert.
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(false);
    }
  });

  mainWindow.on('maximize', (e) => {
    // keep fixed-size window
    e.preventDefault();
  });

  // Tombol X → hide ke tray, bukan keluar
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.webContents.send('check-unsaved-close');
    }
  });
}

function createTray() {
  // On Windows, .ico is most reliable for tray icons
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.ico'));
  tray = new Tray(trayIcon);
  tray.setToolTip('Sholat Reminder\nKlik untuk buka/tutup');

  // Update context menu dengan info waktu sholat berikutnya
  function buildMenu(data = {}) {
    const { nextPrayer = null, lang = 'id' } = data;
    const i18n = I18N[lang] || I18N.id;
    return Menu.buildFromTemplate([

      {
        label: nextPrayer
          ? `⏰ ${nextPrayer.name} — ${nextPrayer.time}`
          : '🕌 Sholat Reminder',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: i18n.openApp,
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents?.send('app-visibility', { visible: true });
        }
      },
      {
        label: i18n.hide,
        click: () => {
          mainWindow.hide();
          mainWindow.webContents?.send('app-visibility', { visible: false });
        }
      },
      {
        label: i18n.testNotif,
        click: () => {
          const prayerKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
          const randomKey = prayerKeys[Math.floor(Math.random() * prayerKeys.length)];
          const prayerName = PRAYER_NAMES[lang][randomKey];
          const arabicName = PRAYER_ARABIC[randomKey];
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Suruh renderer handle notifikasi test (konsisten dengan tombol test di settings)
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('test-adhan', { name: prayerName, arabic: arabicName, time, lang });
          }
        }
      },
      { type: 'separator' },
      {
        label: i18n.exit,
        click: () => { isQuitting = true; app.quit(); }
      }
    ]);
  }

  tray.setContextMenu(buildMenu({ lang: 'id' }));

  // Klik kiri → toggle window
  tray.on('click', () => {
    const shouldHide = mainWindow.isVisible() && mainWindow.isFocused();
    if (shouldHide) {
      mainWindow.hide();
      mainWindow.webContents?.send('app-visibility', { visible: false });
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents?.send('app-visibility', { visible: true });
    }
  });

  // Update tray menu dari renderer (kirim info next prayer)
  ipcMain.on('update-tray', (event, data) => {
    tray.setContextMenu(buildMenu({ ...data, lang: data.lang || 'id' }));
    tray.setToolTip(`Sholat Reminder\nBerikutnya: ${data.name} — ${data.time}`);
    updateHintContent(data);
  });

  ipcMain.on('hint-data', (event, data) => {
    updateHintContent(data);
  });
}

function ensureAdhanWindow() {
  if (adhanWindow && !adhanWindow.isDestroyed()) return adhanWindow;

  adhanWindow = new BrowserWindow({
    width: 320,
    height: 160,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  adhanWindow.on('closed', () => {
    adhanWindow = null;
  });

  return adhanWindow;
}

function ensureHintWindow() {
  if (hintWindow && !hintWindow.isDestroyed()) return hintWindow;

  const display = screen.getPrimaryDisplay();
  const width = Math.min(380, Math.floor(display.workAreaSize.width * 0.85));
  const height = 84;

  hintWindow = new BrowserWindow({
    width,
    height,
    x: Math.floor((display.workArea.x + display.workAreaSize.width - width) / 2),
    y: display.workArea.y + 10,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js'),
    },
  });

  hintWindow.setIgnoreMouseEvents(true);
  hintWindow.loadFile(path.join(__dirname, 'src', 'hint.html'))
    .then(() => updateHintContent(hintData))
    .catch(() => {});

  hintWindow.on('closed', () => {
    hintWindow = null;
  });

  return hintWindow;
}

function updateHintContent(data) {
  hintData = {
    title: data.title || hintData.title,
    body: data.body || hintData.body,
  };

  if (hintWindow && hintWindow.webContents) {
    hintWindow.webContents.send('hint-update', hintData);
  }
}

function showHintWindow({ title, body }) {
  hintData = { title, body };

  const win = ensureHintWindow();
  if (win && win.webContents) {
    win.webContents.send('hint-update', hintData);
    win.webContents.send('hint-show');
    if (!win.isVisible()) win.showInactive();
  }
}

function hideHintWindow() {
  if (hintWindow && hintWindow.webContents && !hintWindow.isDestroyed()) {
    hintWindow.webContents.send('hint-hide');
    setTimeout(() => {
      if (hintWindow && !hintWindow.isDestroyed()) {
        hintWindow.hide();
      }
    }, 220);
  }

  hintHoverActive = false;
}

function startHintMonitor() {
  setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const centerX = display.bounds.x + display.bounds.width / 2;
    const isTopCenter = cursor.y <= display.bounds.y + 20 && Math.abs(cursor.x - centerX) <= 180;

    if (isTopCenter) {
      if (!hintHoverActive) {
        hintHoverActive = true;
        showHintWindow(hintData);
      }
      return;
    }

    if (hintHoverActive) {
      hideHintWindow();
    }
  }, 120);
}

function positionAdhanWindow(win) {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const margin = 14;
  const [w, h] = win.getSize();
  win.setPosition(sw - w - margin, sh - h - margin, false);
}

function showAdhan(payload) {
  const { name, time, title, body } = payload || {};
  const safe = {
    name: String(name || 'Sholat'),
    time: String(time || ''),
    title: title ? String(title) : '',
    body: body ? String(body) : '',
    lang: payload.lang === 'en' ? 'en' : 'id',
  };

  // Gunakan title/body yang sudah ter-localize dari renderer.
  // Hindari fallback Indonesia saat user sudah memilih English.
  const localizedTitle = safe.title
    ? safe.title
    : (safe.lang === 'en'
        ? `🔔 Prayer Time ${safe.name}`
        : `🔔 Waktu Sholat ${safe.name}`);
  const localizedBody = safe.body
    ? safe.body
    : (safe.lang === 'en'
        ? `Allahu Akbar — It's time for prayer ${safe.name}`
        : `Allahu Akbar — Saatnya menunaikan sholat ${safe.name}${safe.time ? ` (${safe.time})` : ''}`);

  // 1) Tray balloon (best effort)
  try {
    if (tray) {
      tray.displayBalloon({
        title: localizedTitle,
        content: localizedBody,
        iconType: 'custom',
        icon: path.join(__dirname, 'assets', 'icon.png'),
      });
    }
  } catch {}

  // 2) Windows Notification (best effort)
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: localizedTitle,
        body: localizedBody,
        icon: path.join(__dirname, 'assets', 'icon.png'),
      }).show();
    }
  } catch {}

  // 3) Guaranteed fallback popup window (always shows)
  const win = ensureAdhanWindow();
  const query = {
    name: safe.name,
    arabic: payload.arabic || '',
    time: safe.time,
    lang: safe.lang,
    title: safe.title,
    body: safe.body,
  };
  win.loadFile(path.join(__dirname, 'src', 'adhan.html'), { query }).catch(() => {});
  positionAdhanWindow(win);
  win.showInactive();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.focus();
}

// ── IPC Handlers ──
ipcMain.on('minimize-window', () => mainWindow.minimize());
// Close button should NOT quit; it hides to tray.
// Full quit is available from tray menu ("Keluar").
ipcMain.on('close-window', () => mainWindow.hide());

// Notifikasi ditangani sepenuhnya oleh renderer via IPC show-notification dan show-adhan.


ipcMain.on('show-notification', (event, { title, body }) => {
  // Tray balloon
  try {
    if (tray) {
      tray.displayBalloon({
        title,
        content: body,
        iconType: 'custom',
        icon: path.join(__dirname, 'assets', 'icon.png'),
      });
    }
  } catch {}

  // Windows Notification
  try {
    if (Notification.isSupported()) {
      const notif = new Notification({
        title,
        body,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        silent: false,
        timeoutType: 'default',
      });
      notif.show();
      notif.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
      });
    }
  } catch {}
});

// Tray balloon (popup kecil di taskbar) khusus waktu sholat tiba
ipcMain.on('show-adhan', (event, { name, time, title, body, lang }) => {
  showAdhan({ name, time, title, body, lang });
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  credits: 'Made by Arza Maulana Zafar',
}));

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

ipcMain.on('unsaved-status', (event, hasUnsaved) => {
  if (hasUnsaved) {
    const lang = 'id'; // asumsi, bisa ambil dari state
    const message = lang === 'id'
      ? 'Ada perubahan yang belum disimpan. Simpan dulu sebelum keluar aplikasi.'
      : 'There are unsaved changes. Save first before exiting the application.';
    const buttons = lang === 'id' ? ['Keluar Saja', 'Batal'] : ['Exit Anyway', 'Cancel'];
    const { dialog } = require('electron');
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: lang === 'id' ? 'Konfirmasi Keluar' : 'Exit Confirmation',
      message,
      buttons,
      defaultId: 1,
      cancelId: 1,
    }).then(result => {
      if (result.response === 0) { // Keluar Saja / Exit Anyway
        isQuitting = true;
        app.quit();
      }
    });
  } else {
    isQuitting = true;
    app.quit();
  }
});

ipcMain.on('close-confirmed', () => {
  mainWindow.hide();
  mainWindow.webContents?.send('app-hidden', { hidden: true });

  // Kasih tau user pertama kali
  if (!app.shownTrayHint) {
    app.shownTrayHint = true;
    tray.displayBalloon({
      title: 'Sholat Reminder',
      content: 'Aplikasi tetap berjalan di system tray. Klik ikon bulan untuk buka lagi.',
      iconType: 'info',
    });
  }
});

// ── Start ──
app.whenReady().then(async () => {
  app.setAppUserModelId('com.sholat.reminder'); // Penting buat notif Windows 10/11

  // Best-effort: set HKCU Run key so app can start with Windows.
  // (Installer can also do this; this ensures it works even for portable runs.)
  try {
    const exePath = app.getPath('exe');
    await setRunKey({
      displayName: 'Sholat Reminder',
      exePath,
    });
  } catch {}

  createWindow();
  createTray();
  startHintMonitor();
});

app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => {
  // Jangan quit — tetap di tray
});

# Shorem - Sholat Reminder App

**Shorem (Sholat Reminder)** is a Windows prayer time reminder app with an elegant dark design, available for **ASEAN countries** (Indonesia, Malaysia, Singapore, Brunei, Philippines, Thailand). It displays prayer schedules based on city coordinates, real-time countdown to the next prayer, Hijri calendar, native Windows notifications, and Adhan popup.

I chose **Electron** as the framework because it allows me to build a desktop app using only **HTML, CSS, and JavaScript** — no need to learn other languages like Next.js, React, or Vue.js. With Electron, web code runs directly as a native desktop application.

---

### Preview UI

| Main UI |
|---------|
| ![MainUI](https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/MainUI.jpeg) |

<table>
<tr><th colspan="3" align="center">Settings</th></tr>
<tr>
<td><img src="https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/SettingsUI.jpeg" alt="SettingsUI"></td>
<td><img src="https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/SettingsUI-(ChooseCountry).jpeg" alt="SettingsUI"></td>
<td><img src="https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/SettingsUI-(ScrollDown).jpeg" alt="SettingsUI"></td>
</tr>
</table>

| Notification Feature | Countdown Feature |
|----------------------|-------------------|
| ![NotificationFeature](https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/NotificationFeature.jpeg) | ![CountdownFeature](https://github.com/Arza707/Sholat-Reminder-App/raw/main/AssetsForReadme/ReadmeUI/CountdownFeature.jpeg) |

---

### Features

- Automatic prayer times based on city coordinates
- Real-time countdown to next prayer
- Automatic Hijri calendar
- Native Windows notifications + Adhan popup
- X minutes before prayer reminder
- Minimize to System Tray (runs in background)
- City selection: Tangerang, Jakarta, Bandung, Surabaya, Yogyakarta, + 50+ ASEAN cities
- Calculation methods: Muslim World League, MABIMS, Kemenag, JAKIM, MUIS, MUIB, NCMF, etc.
- Per-prayer notification toggle
- Multi-language (Indonesia / English)
- Auto-save settings

### Download App

| Version | File | Description | OS Support |
|---------|------|-------------|------------|
| Installer | [Download Installer](https://github.com/Arza707/Sholat-Reminder-App/raw/main/dist/Sholat%20Reminder%20Setup%201.0.0.exe) | Requires installation, finish the setup | Windows |
| Portable | [Download Portable](https://github.com/Arza707/Sholat-Reminder-App/raw/main/dist/Sholat%20Reminder%201.0.0.exe) | Run directly, no installation needed | Windows |

### Installation (For Developer)

**Requirements:** Node.js 18+ and npm (internet for first install)

#### File Structure

```
sholat-app/
├── main.js              ← Electron main process
├── package.json         ← Config project & dependencies
├── assets/
│   └── icon.png         ← App icon
└── src/
    ├── index.html       ← UI structure
    ├── style.css        ← Styling
    ├── app.js           ← Countdown, notifications, settings logic
    ├── prayer.js        ← Prayer time calculation (Aladhan API)
    ├── adhan.html/.js   ← Adhan notification popup
    ├── hint.html/.js    ← Prayer info overlay
    ├── preload.js       ← Electron contextBridge
    ├── startup.js       ← Windows auto-start registry
    └── data/
        └── regions.js   ← ASEAN city data
```

```bash
cd sholat-app
npm install
npm start
```

#### If you want to make portable.exe

```bash
npm run build
```

Output is in `dist/` as a portable `Sholat Reminder 1.0.0.exe` file.

#### If you want to make Installer.exe

```bash
npm run build-installer
```

Output is in `dist/` as a installer `Sholat Reminder Setup 1.0.0.exe` file.


### Credits

**Shorem — Sholat Reminder App**

Created by **Arza Maulana Zafar**.

![License](https://img.shields.io/badge/License-Public%20Domain-blue)
![Free](https://img.shields.io/badge/Free%20to%20Use-Yes-brightgreen)

This application is released into the **public domain**.  
You are free to use, modify, and distribute it for any purpose — personal, educational, or commercial — without asking permission and without any warranty.
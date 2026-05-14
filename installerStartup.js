/*
  Windows Startup integration for electron-builder NSIS installer.

  electron-builder can run custom scripts via "nsis" hooks.
  We create a registry entry so the app shows in:
  Windows Settings -> Apps -> Startup

  This file is referenced from build config (if enabled).
*/

const { execFileSync } = require('node:child_process');

function addRunKey({ displayName, exePath }) {
  // Use current-user Run key so it shows in Startup apps list.
  // Windows may display it as a startup entry depending on OS build.
  const cmd = [
    'reg', 'add',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    '/v', displayName,
    '/t', 'REG_SZ',
    '/d', exePath,
    '/f'
  ];

  execFileSync(cmd[0], cmd.slice(1), { stdio: 'ignore' });
}

function main() {
  const displayName = process.env.STARTUP_NAME || 'Sholat Reminder';
  const exePath = process.env.STARTUP_EXE_PATH;

  if (!exePath) {
    // no-op
    process.exit(0);
  }

  addRunKey({ displayName, exePath });
}

main();


// Startup integration (Windows) via HKCU\Software\Microsoft\Windows\CurrentVersion\Run
// This file is intentionally small and can be invoked from main process.

const { execFile } = require('node:child_process');

function setRunKey({ displayName, exePath }) {
  if (!displayName || !exePath) return Promise.resolve(false);

  const args = [
    'add',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    '/v', displayName,
    '/t', 'REG_SZ',
    '/d', exePath,
    '/f',
  ];

  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true }, (err) => {
      resolve(!err);
    });
  });
}

module.exports = { setRunKey };


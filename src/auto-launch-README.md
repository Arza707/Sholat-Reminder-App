# Windows Startup (Auto-launch)

Aplikasi dikonfigurasi agar mencoba auto-start secara otomatis memakai library `electron-autostart`.

## Catatan penting
- Fungsionalitas ini bekerja setelah aplikasi dipackage (installer/portable) dan path exe tersedia.
- Untuk versi dev (`npm start`), perilaku bisa berbeda karena app belum terpackage.

## Cara build
- Portable: `npm run build`
- Installer: `npm run build-installer`


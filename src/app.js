/**
 * app.js — Logic utama aplikasi Sholat Reminder
 */

const ipcRenderer = window.electronAPI;

// Helper nama sholat untuk hint/notification saat waktu sudah tiba
const PRAYER_NAMES = {
  id: { fajr: 'Subuh', sunrise: 'Syuruq', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya' },
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


const METHODS_BY_COUNTRY = {
  ID: [
    { id: 3, name: 'Muslim World League' },
    { id: 104, name: 'MABIMS Method' },
    { id: 20, name: 'Kementrian Agama (Kemenag) RI' },
  ],
  MY: [
    { id: 3, name: 'Muslim World League' },
    { id: 17, name: 'Jabatan Kemajuan Islam Malaysia (JAKIM)' },
    { id: 104, name: 'MABIMS Method' },
  ],
  SG: [
    { id: 3, name: 'Muslim World League' },
    { id: 11, name: 'Majilis Ugama Islam Singapura (MUIS)' },
    { id: 104, name: 'MABIMS Method' },
  ],
  BN: [
    { id: 3, name: 'Muslim World League' },
    { id: 101, name: 'Majilis Ugama Brunei (MUIB)' },
    { id: 104, name: 'MABIMS Method' },
  ],
  PH: [
    { id: 3, name: 'Muslim World League' },
    { id: 103, name: 'National Commission On Muslim Filipinos (NCMF)' },
    { id: 104, name: 'MABIMS Method' },
  ],
  TH: [
    { id: 3, name: 'Muslim World League' },
    { id: 102, name: 'Pejabat Sheikhul Islam (Chularatchamontri) Thailand' },
    { id: 104, name: 'MABIMS Method' },
  ],
  _default: [
    { id: 3, name: 'Muslim World League' },
    { id: 104, name: 'MABIMS Method' },
  ],
};

// ── State ──
let state = loadState();
let prayers = [];
let hijriDate = '';
let countdownInterval = null;
let notifiedKeys = new Set();
let hasUnsavedChanges = false;
const DEBUG = localStorage.getItem('debugNotif') === '1';
const I18N = {
  id: {
    appTitle: 'Sholat Reminder',
    settingsTitle: 'Pengaturan',
    settingsButtonTitle: 'Pengaturan',
    closeButtonTitle: 'Sembunyikan ke tray',
    nextPrayerLabel: 'Waktu Sholat Berikutnya',
    labels: {
      country: 'Negara',
      province: 'Provinsi / Negeri',
      city: 'Kota / Kabupaten',
      district: 'Kecamatan',
      language: 'Bahasa',
      method: 'Metode Perhitungan',
      adhanNotif: 'Notifikasi Adzan',
      reminder: 'Notif Pengingat (menit sebelum)',
      testNotif: 'Test Notifikasi',
      donation: 'Donasi',
      optimization: 'Mode Optimasi (hemat RAM)',
    },
    reminderOptions: { none: 'Tidak ada', minutes: 'menit' },
    units: { hour: 'jam', minute: 'menit', second: 'detik' },
    testAdhanButton: 'Test Notifikasi Waktu Sholat',
    testReminderButton: 'Test Notifikasi Pengingat',
    donateButton: 'Donasi via Saweria',
    saveSettingsButton: 'Simpan & Tutup',
    cityFallback: 'Kota Kustom',
    nextPrayerTimeSuffix: 'WIB',
    toggle: { on: 'On', off: 'Off' },
    notification: {
      adhanTitle: 'Waktu Sholat',
      adhanBody: 'Allahu Akbar — Saatnya menunaikan sholat',
      adhanBase: 'Allahu Akbar — Saatnya',
      reminderSuffix: 'Menit Lagi',
      timeNow: 'Waktu {name}',
      timeLeftHour: '{h} jam {m} menit lagi',
      timeLeftMinute: '{m} menit {s} detik lagi',
      timeLeftSecond: '{s} detik lagi',
      hoverHintDefault: 'Gerakkan kursor ke bagian atas layar untuk melihat info sholat berikutnya.',
    },
    notifNames: { fajr: 'Subuh', sunrise: 'Syuruq', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya' },
    days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  },
  en: {
    appTitle: 'Prayer Reminder',
    settingsTitle: 'Settings',
    settingsButtonTitle: 'Settings',
    closeButtonTitle: 'Hide to tray',
    nextPrayerLabel: 'Next Prayer Time',
    labels: {
      country: 'Country',
      province: 'Province / State',
      city: 'City / Regency',
      district: 'Subdistrict',
      language: 'Language',
      method: 'Calculation Method',
      adhanNotif: 'Adhan Notifications',
      reminder: 'Reminder Notification (minutes before)',
      testNotif: 'Test Notification',
      donation: 'Donate',
      optimization: 'Optimization Mode (save RAM)',
    },
    reminderOptions: { none: 'None', minutes: 'minutes' },
    units: { hour: 'hour', minute: 'minutes', second: 'seconds' },
    testAdhanButton: 'Test Prayer Time Notification',
    testReminderButton: 'Test Reminder Notification',
    donateButton: 'Donate via Saweria',
    saveSettingsButton: 'Save & Close',
    cityFallback: 'Custom City',
    nextPrayerTimeSuffix: 'local',
    toggle: { on: 'On', off: 'Off' },
    notification: {
      adhanTitle: 'Prayer Time',
      adhanBody: "Allahu Akbar — It's time for prayer",
      adhanBase: "Allahu Akbar — It's time for",
      reminderSuffix: 'minutes left',
      timeNow: 'Time {name}',
      timeLeftHour: '{h}h {m}m left',
      timeLeftMinute: '{m}m {s}s left',
      timeLeftSecond: '{s}s left',
      hoverHintDefault: '--------------------',
    },
    notifNames: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};

function dlog(...args) {
  if (DEBUG) console.log('[notif]', ...args);
}

function showInAppNotification(message, duration = 3000) {
  const notif = document.getElementById('in-app-notification');
  const text = document.getElementById('notification-text');
  text.textContent = message;
  notif.classList.add('show');
  setTimeout(() => {
    notif.classList.remove('show');
  }, duration);
}

function markUnsavedChanges() {
  hasUnsavedChanges = true;
}

function lang() {
  return I18N[state.language] ? state.language : 'id';
}

function tr() {
  return I18N[lang()];
}

function t(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function formatHintPayload(name, time, diff) {
  const strings = tr().notification;
  const langKey = lang();

  const cleanName = String(name || '').trim();
  const prayerKey = prayers?.find(p => p.name === cleanName)?.key || '';
  let localizedPrayerName = PRAYER_NAMES[langKey]?.[prayerKey] || cleanName;
  if ((cleanName === "Jum'at" || cleanName === "Jumu'ah") && localizedPrayerName !== cleanName) {
    localizedPrayerName = cleanName;
  }

  const title = t(strings.timeNow, { name: localizedPrayerName });
  let body;

  // tampilkan status "waktunya" untuk 2 menit setelah jam sholat tiba
  if (typeof diff === 'number') {
    const twoMin = 2 * 60 * 1000;

    if (diff > 0) {
      // saat countdown menampilkan 00:00:00 (< 1 detik), langsung tampilkan "waktunya sholat"
      if (diff < 1000) {
        if (prayerKey === 'sunrise') {
          body = langKey === 'en' ? 'It is time for Sunrise' : 'Waktunya Syuruq';
        } else {
          const whenText = langKey === 'en' ? 'Prayer time' : 'Waktu sholat';
          body = `${whenText} ${localizedPrayerName}`;
        }
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        if (h > 0) body = t(strings.timeLeftHour, { h, m });
        else if (m > 0) body = t(strings.timeLeftMinute, { m, s });
        else body = t(strings.timeLeftSecond, { s });
      }
    } else if (diff >= -twoMin) {
      // Khusus Syuruq: user minta tertulis “waktunya syuruq”
      if (prayerKey === 'sunrise') {
        body = langKey === 'en' ? 'It is time for Sunrise' : 'Waktunya Syuruq';
      } else {
        const whenText = langKey === 'en'
          ? 'Prayer time'
          : 'Waktu sholat';
        // Requirements user: hint jangan cuma “waktunya”, tapi sekalian nama sholat + “waktu sholat apa”
        const whatText = localizedPrayerName ? `${localizedPrayerName}` : cleanName;
        body = `${whenText} ${whatText}`;
      }
    } else {
      // Setelah melewati batas window (diff < -twoMin), sebelumnya tampilkan teks statis.
      // Sekarang: tampilkan countdown ke *next waktu sholat*.
      const nextIdx = (getActivePrayerIndex() + 1) % prayers.length;
      const nextP = prayers?.[nextIdx];

      if (nextP?.date) {
        const now2 = new Date();
        const nextDiff = nextP.date - now2;

        // Jika sudah "habis" (waktu sholat tepat/terlewat), tampilkan pesan "waktunya".
        // Sesuai request user: syuruq khusus "Matahari sudah terbit".
        // Dan pesan ini bertahan hanya 2 menit (window seperti logika diff sebelumnya).
        if (nextDiff <= 0 && nextDiff >= -twoMin) {
          const nextKey = nextP.key;
          if (nextKey === 'sunrise') {
            body = langKey === 'en' ? 'The sun has risen' : 'Matahari sudah terbit';
          } else {
            const whenText = langKey === 'en'
              ? 'It is time to pray'
              : 'Waktunya menunaikan sholat';
            const whatText = localizedPrayerName ? `${localizedPrayerName}` : cleanName;
            body = localizedPrayerName ? `${whenText} (${whatText})` : whenText;
          }
        } else if (nextDiff <= 0) {
          // Lewat >2 menit: kembali tampilkan countdown ke next prayer.
          const safeDiff = Math.max(0, nextDiff);
          const h = Math.floor(safeDiff / 3600000);
          const m = Math.floor((safeDiff % 3600000) / 60000);
          const s = Math.floor((safeDiff % 60000) / 1000);

          if (h > 0) body = t(strings.timeLeftHour, { h, m });
          else if (m > 0) body = t(strings.timeLeftMinute, { m, s });
          else body = t(strings.timeLeftSecond, { s });
        } else {
          // Countdown masih berjalan
          const h = Math.floor(nextDiff / 3600000);
          const m = Math.floor((nextDiff % 3600000) / 60000);
          const s = Math.floor((nextDiff % 60000) / 1000);

          if (h > 0) body = t(strings.timeLeftHour, { h, m });
          else if (m > 0) body = t(strings.timeLeftMinute, { m, s });
          else body = t(strings.timeLeftSecond, { s });
        }
      } else {
        body = strings.hoverHintDefault;
      }
    }
  } else {
    body = strings.hoverHintDefault;
  }

  return { title, body, time, diff };
}


function getAdhanNotificationStrings(name, arabicName) {
  const strings = tr().notification;
  const cleanName = String(name || '').trim();
  const isSyuruq = cleanName.toLowerCase() === 'syuruq' || cleanName.toLowerCase() === 'sunrise';
  if (isSyuruq) {
    const title = lang() === 'en' ? 'The sun has risen' : 'Matahari sudah terbit';
    return { title, body: title };
  }
  const displayName = cleanName;
  const title = `${strings.adhanTitle} ${displayName}`;
  const body = `${strings.adhanBody} ${displayName}`;
  return { title, body };
}

function getReminderNotificationStrings(minutes, name, key) {
  const strings = tr().notification;
  const langKey = lang();
  const cleanName = String(name || '').trim();
  const isSunrise = key === 'sunrise';

  if (isSunrise) {
    const body = langKey === 'en'
      ? `${minutes} ${strings.reminderSuffix.toLowerCase()} until sunrise`
      : `${minutes} ${strings.reminderSuffix.toLowerCase()} lagi akan segera syuruq`;
    return {
      title: `⏰ ${minutes} ${strings.reminderSuffix}`,
      body,
    };
  }

  const namePart = cleanName ? ` (${cleanName})` : '';
  const body = langKey === 'en'
    ? `${minutes} ${strings.reminderSuffix.toLowerCase()} until adhan${namePart}`
    : `${minutes} ${strings.reminderSuffix.toLowerCase()} lagi akan segera adzan${namePart}`;
  return {
    title: `⏰ ${minutes} ${strings.reminderSuffix}`,
    body,
  };
}

function loadState() {
  const coordToLoc = {
    '-6.1781,106.6298': { country: 'ID', province: 'ID-BT', city: 'ID-BT-01' },
    '-6.2088,106.8456': { country: 'ID', province: 'ID-JK', city: 'ID-JK-04' },
    '-6.9175,107.6191': { country: 'ID', province: 'ID-JB', city: 'ID-JB-01' },
    '-7.2575,112.7521': { country: 'ID', province: 'ID-JI', city: 'ID-JI-01' },
    '-7.7956,110.3695': { country: 'ID', province: 'ID-YO', city: 'ID-YO-01' },
    '-0.9231,119.8707': { country: 'ID', province: 'ID-ST', city: 'ID-ST-01' },
    '3.5952,98.6722':   { country: 'ID', province: 'ID-SU', city: 'ID-SU-01' },
    '-5.1477,119.4328': { country: 'ID', province: 'ID-SN', city: 'ID-SN-01' },
  };
  const defaults = {
    coords: '-6.1781,106.6298',
    country: 'ID',
    province: 'ID-BT',
    city: 'ID-BT-01',
    district: '',
    method: 104,
    remindMin: 10,
    language: 'id',
    notifEnabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, sunrise: true },
    hintBlur: true,
    hintShow: true,
    cpuSaver: false,
    optimization: false,
  };
  try {
    const saved = localStorage.getItem('sholatState');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format (coords only) to new format
      if (!parsed.country && parsed.coords) {
        const mapped = coordToLoc[parsed.coords];
        if (mapped) {
          parsed.country = mapped.country;
          parsed.province = mapped.province;
          parsed.city = mapped.city;
          parsed.district = '';
        }
      }
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
}

function saveState() {
  localStorage.setItem('sholatState', JSON.stringify(state));
}

// ── Init ──
let notificationsInterval = null; // legacy (tidak dipakai lagi)
let midnightTimeout = null;
let isAppVisible = true;

function setVisibleMode(visible) {
  isAppVisible = !!visible;

  if (!isAppVisible) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    stopClock();
  } else {
    startCountdown();
    startClock();
    updateProgress();
  }
}

function init() {
  applyLanguage();
  applySettings();
  setupUI();
  loadAppMeta();
  calculateAndRender();
  startCountdown();
  startClock();

  // Scheduler notifikasi berbasis trigger tunggal (hindari polling terus)
  scheduleNextNotification();

  // IPC: resume/suspend dari main process (X hide / tray show)
  ipcRenderer.on('app-visibility', (event, payload) => {
    setVisibleMode(payload?.visible);
  });

  ipcRenderer.on('check-unsaved', () => {
    ipcRenderer.send('unsaved-status', hasUnsavedChanges);
  });

  ipcRenderer.on('check-unsaved-close', () => {
    if (hasUnsavedChanges) {
      const message = lang() === 'id'
        ? 'Ada perubahan yang belum disimpan. Simpan dulu sebelum keluar.'
        : 'There are unsaved changes. Save first before exiting.';
      showInAppNotification(message);
      return;
    }
    ipcRenderer.send('close-confirmed');
  });

  // Test notifikasi dari tray menu (konsisten dengan tombol test di settings)
  ipcRenderer.on('test-adhan', (_event, payload) => {
    const adhan = getAdhanNotificationStrings(payload.name, payload.arabic);
    ipcRenderer.send('show-adhan', { name: payload.name, arabic: payload.arabic, time: payload.time, title: adhan.title, body: adhan.body, lang: state.language });
  });

  // Reset notified set tiap hari
  if (midnightTimeout) clearTimeout(midnightTimeout);
  const now = new Date();
  const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  midnightTimeout = setTimeout(() => {
    notifiedKeys.clear();
    calculateAndRender();
  }, msToMidnight);

  window.addEventListener('online', () => {
    const msg = lang() === 'en' ? 'Internet connection restored.' : 'Koneksi internet tersambung kembali.';
    showInAppNotification(msg, 2000);
    clearRetry();
    calculateAndRender();
  });

  window.addEventListener('beforeunload', () => {
    if (countdownInterval) clearInterval(countdownInterval);
    if (clockInterval) clearInterval(clockInterval);
    if (notificationTimeout) clearTimeout(notificationTimeout);
    if (retryInterval) clearTimeout(retryInterval);
    if (midnightTimeout) clearTimeout(midnightTimeout);
    countdownInterval = null;
    clockInterval = null;
    notificationTimeout = null;
    retryInterval = null;
    midnightTimeout = null;
  });

}


async function loadAppMeta() {
  const elFooter = document.getElementById('app-meta');
  const elSettings = document.getElementById('app-meta-settings');
  try {
    const info = await ipcRenderer.invoke('get-app-info');
    const version = info?.version ? `v${info.version}` : '';
    const credits = info?.credits || 'Made by Arza Maulana Zafar';
    const text = [version, credits].filter(Boolean).join(' • ');
    if (elFooter) elFooter.textContent = text;
    if (elSettings) elSettings.textContent = text;
  } catch {
    const fallback = 'Made by Arza Maulana Zafar';
    if (elFooter) elFooter.textContent = fallback;
    if (elSettings) elSettings.textContent = fallback;
  }
}

function applyLanguage() {
  const t = tr();
  document.documentElement.lang = lang();
  document.title = t.appTitle;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('settings-title', t.settingsTitle);
  setText('next-label', t.nextPrayerLabel);
  setText('label-country', t.labels.country);
  setText('label-province', t.labels.province);
  setText('label-city', t.labels.city);
  setText('label-district', t.labels.district);
  setText('label-language', t.labels.language);
  setText('label-method', t.labels.method);
  setText('label-adhan-notif', t.labels.adhanNotif);
  setText('label-reminder', t.labels.reminder);
  setText('label-test-notif', t.labels.testNotif);
  setText('label-donation', t.labels.donation);
  setText('label-optimization', t.labels.optimization);
  setText('test-adhan', t.testAdhanButton);
  setText('test-reminder', t.testReminderButton);
  setText('btn-donate', t.donateButton);
  setText('save-settings', t.saveSettingsButton);

  // Toggle labels (follow language)
  const setToggleText = (id, onText, offText, checked) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = checked ? onText : offText;
  };
  setToggleText('toggle-hint-blur-label', t.toggle.on, t.toggle.off, state.hintBlur);
  setToggleText('toggle-hint-show-label', t.toggle.on, t.toggle.off, state.hintShow);
  setToggleText('toggle-cpu-saver-label', t.toggle.on, t.toggle.off, state.cpuSaver);
  setText('toggle-optimization-label', t.labels.optimization);


  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) btnSettings.title = t.settingsButtonTitle;
  const btnClose = document.getElementById('btn-close');
  if (btnClose) btnClose.title = t.closeButtonTitle;

  const reminderSelect = document.getElementById('reminder-minutes');
  if (reminderSelect) {
    ['0', '5', '10', '15', '30'].forEach((value) => {
      const option = reminderSelect.querySelector(`option[value="${value}"]`);
      if (!option) return;
      option.textContent = value === '0' ? t.reminderOptions.none : `${value} ${t.reminderOptions.minutes}`;
    });
  }

  // Set countdown units
  const cdUnits = document.querySelectorAll('.cd-unit');
  if (cdUnits.length >= 3) {
    cdUnits[0].textContent = t.units.hour;
    cdUnits[1].textContent = t.units.minute;
    cdUnits[2].textContent = t.units.second;
  }
}

function populateSelect(id, options, selectedVal, placeholder, fallbackName) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = '';
  if (options.length === 0 && fallbackName) {
    const opt = document.createElement('option');
    opt.value = '_default';
    opt.textContent = fallbackName;
    opt.selected = true;
    sel.appendChild(opt);
  } else {
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder;
    sel.appendChild(ph);
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.name;
      if (o.id === selectedVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }
}

function updateCascading() {
  const country = state.country || '';
  const province = state.province || '';
  const city = state.city || '';
  const district = state.district || '';
  const t = tr();

  const phCountry = lang() === 'id' ? 'Pilih Negara' : 'Select Country';
  const phProvince = lang() === 'id' ? 'Pilih Provinsi' : 'Select Province';
  const phCity = lang() === 'id' ? 'Pilih Kota/Kabupaten' : 'Select City';
  const phDistrict = lang() === 'id' ? 'Pilih Kecamatan' : 'Select District';

  populateSelect('country-select', RegionData.countries, country, phCountry);
  document.getElementById('province-group').style.display = country ? '' : 'none';
  document.getElementById('city-group').style.display = 'none';
  document.getElementById('district-group').style.display = 'none';

  if (country) {
    const provinces = RegionData.getProvinces(country);
    populateSelect('province-select', provinces, province, phProvince);
    document.getElementById('province-group').style.display = '';
  }
  if (province) {
    const cities = RegionData.getCities(province);
    const provName = RegionData.getProvince(province)?.name || '';
    const fbCity = lang() === 'id' ? provName + ' (Pusat)' : provName + ' (Center)';
    populateSelect('city-select', cities, city, phCity, fbCity);
    document.getElementById('city-group').style.display = '';
  }
  if (city && city !== '_default') {
    const districts = RegionData.getDistricts(city);
    populateSelect('district-select', districts, district, phDistrict);
    document.getElementById('district-group').style.display = districts.length > 0 ? '' : 'none';
  } else if (city === '_default') {
    populateSelect('district-select', [], '', phDistrict);
    document.getElementById('district-group').style.display = 'none';
  }
}

function populateMethodSelect(countryCode) {
  const sel = document.getElementById('method-select');
  if (!sel) return;
  const methods = METHODS_BY_COUNTRY[countryCode] || METHODS_BY_COUNTRY._default;
  sel.innerHTML = '';
  methods.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });
  const validIds = methods.map(m => m.id);
  if (!validIds.includes(Number(state.method))) {
    state.method = validIds[0];
  }
  sel.value = state.method;
}

function showPrayerArrived(prayer) {
  const cd = document.getElementById('countdown');
  cd.classList.add('arrived');
  const nameEl = document.getElementById('arrived-name');
  const nextLabel = document.getElementById('next-label');
  document.getElementById('next-prayer-name').style.display = 'none';
  document.getElementById('next-prayer-card').classList.add('arrived');
  if (prayer.key === 'sunrise') {
    nameEl.textContent = lang() === 'id' ? 'Matahari sudah terbit' : 'The sun has risen';
    nextLabel.textContent = '';
  } else {
    nameEl.textContent = prayer.name;
    nextLabel.textContent = lang() === 'id' ? 'Waktunya' : 'Time for';
  }
}

function hidePrayerArrived() {
  document.getElementById('countdown').classList.remove('arrived');
  document.getElementById('next-label').textContent = tr().nextPrayerLabel;
  document.getElementById('next-prayer-name').style.display = '';
  document.getElementById('next-prayer-card').classList.remove('arrived');
}

function applySettings() {
  document.getElementById('language-select').value = lang();
  document.getElementById('method-select').value = state.method;
  document.getElementById('reminder-minutes').value = state.remindMin;

  updateCascading();
  populateMethodSelect(state.country);

  const t = tr();
  const label = RegionData.getLocationLabel(state.country, state.province, state.city, state.district);
  document.getElementById('city-display').textContent = label || t.cityFallback;

  document.body.classList.toggle('optimized', !!state.optimization);
  const gf = document.getElementById('google-fonts');
  if (gf && state.optimization) gf.remove();

  const optWrapper = document.getElementById('toggle-optimization-wrapper');
  const optCb = optWrapper?.querySelector('input[type="checkbox"]');
  if (optCb) optCb.checked = !!state.optimization;
  if (optWrapper) optWrapper.classList.toggle('on', !!state.optimization);
}

let retryInterval = null;

async function calculateAndRender() {
  const [lat, lng] = state.coords.split(',').map(Number);
  const locTz = getLocationTimezoneMinutes() / 60;

  document.getElementById('next-prayer-name').textContent = 'Memuat...';

  if (!navigator.onLine) {
    const offlineMsg = lang() === 'en' ? 'No internet connection. Retrying...' : 'Tidak ada koneksi internet. Mencoba ulang...';
    showInAppNotification(offlineMsg, 3000);
    scheduleRetry();
    return;
  }

  try {
    const result = await PrayerCalc.computeTimes(new Date(), lat, lng, locTz, Number(state.method));
    prayers = result.prayers;
    hijriDate = result.hijriDate;
    // Friday: rename Dhuhr → Jumu'ah
    if (new Date().getDay() === 5) {
      const dhuhr = prayers.find(p => p.key === 'dhuhr');
      if (dhuhr) dhuhr.name = lang() === 'id' ? "Jum'at" : "Jumu'ah";
    }
    if (DEBUG) dlog('prayers loaded', prayers.map(p => ({ key: p.key, time: p.time, date: p.date })));
    renderPrayerList();
    renderDates();
    updateNextPrayer();
    updateProgress();
    const idx = getNextPrayerIndex();
    if (prayers[idx]) {
      ipcRenderer.send('update-tray', { name: prayers[idx].name, time: prayers[idx].time, lang: state.language });
    }

    scheduleNextNotification();
    clearRetry();
  } catch (err) {
    console.error('Gagal fetch jadwal sholat:', err);
    const errMsg = lang() === 'en' ? 'Failed to fetch prayer times. Check your internet.' : 'Gagal mengambil jadwal sholat. Periksa koneksi internet.';
    showInAppNotification(errMsg, 4000);
    const failText = lang() === 'en' ? 'Failed to load' : 'Gagal load';
    document.getElementById('next-prayer-name').textContent = failText;
    document.getElementById('cd-h').textContent = '--';
    document.getElementById('cd-m').textContent = '--';
    document.getElementById('cd-s').textContent = '--';
    scheduleRetry();
  }
}

function scheduleRetry() {
  clearRetry();
  retryInterval = setTimeout(() => {
    calculateAndRender();
  }, 15000);
}

function clearRetry() {
  if (retryInterval) {
    clearTimeout(retryInterval);
    retryInterval = null;
  }
}

// ── Render daftar sholat ──
function renderPrayerList() {
  const now = new Date();
  const container = document.getElementById('prayer-list');
  const nextIdx = getNextPrayerIndex();

  container.innerHTML = prayers.map((p, i) => {
    const isPassed = p.date && p.date < now;
    const isActive = i === nextIdx;
    const classes = ['prayer-item', isActive ? 'active' : '', isPassed ? 'passed' : ''].join(' ');

    if (state.optimization) {
      return `
        <div class="${classes}" data-key="${p.key}">
          <div class="prayer-info">
            <div class="prayer-name-text">${p.name}</div>
          </div>
          <div class="prayer-time-text">${p.time}</div>
        </div>
      `;
    }

    return `
      <div class="${classes}" data-key="${p.key}">
        ${isActive ? '<div class="active-indicator"></div>' : ''}
        <div class="prayer-icon">${p.icon}</div>
        <div class="prayer-info">
          <div class="prayer-name-text">${p.name}</div>
          <div class="prayer-name-arabic">${p.arabic}</div>
        </div>
        <div class="prayer-time-text">${p.time}</div>
      </div>
    `;
  }).join('');
}

function renderDates() {
  document.getElementById('hijri-date').textContent = hijriDate || '— — —';

  const now = new Date();
  const days = tr().days;
  const months = tr().months;
  document.getElementById('gregorian-date').textContent =
    `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ── Next prayer ──
function getNextPrayerIndex() {
  const now = new Date();
  if (!prayers || prayers.length === 0) return 0;
  for (let i = 0; i < prayers.length; i++) {
    if (prayers[i].date && prayers[i].date > now) return i;
  }
  // Jika semuanya sudah lewat, maka next prayer adalah index wrap pertama (Subuh besok).
  return 0;
}

function getActivePrayerIndex() {
  const now = new Date();
  if (!prayers || prayers.length === 0) return -1;
  // active = prayer terakhir yang tanggalnya <= now
  let lastIdx = -1;
  for (let i = 0; i < prayers.length; i++) {
    if (prayers[i].date && prayers[i].date <= now) lastIdx = i;
  }
  return lastIdx;
}


function updateNextPrayer() {
  if (!prayers.length) return;
  const idx = getNextPrayerIndex();
  const p = prayers[idx];
  document.getElementById('next-prayer-name').textContent = p.name;
  const label = document.getElementById('next-label');
  if (p.key === 'sunrise') {
    label.textContent = lang() === 'id' ? 'Waktu Terbit Matahari' : 'Sunrise Time';
  } else {
    label.textContent = tr().nextPrayerLabel;
  }
}
function getLocationTimezoneMinutes() {
  const { country, province } = state;
  const ID_TZ = {
    'ID-BA': 480, 'ID-NB': 480, 'ID-NT': 480,
    'ID-KS': 480, 'ID-KI': 480, 'ID-KU': 480,
    'ID-SA': 480, 'ID-GO': 480, 'ID-ST': 480, 'ID-SR': 480,
    'ID-SN': 480, 'ID-SG': 480,
    'ID-MA': 540, 'ID-MU': 540,
    'ID-PA': 540, 'ID-PB': 540, 'ID-PS': 540, 'ID-PT': 540, 'ID-PP': 540, 'ID-PD': 540,
  };
  const CTZ = { MY: 480, SG: 480, PH: 480, TH: 420, BN: 480, VN: 420, LA: 420, KH: 420, TL: 540, MM: 390 };
  if (country === 'ID' && province && ID_TZ[province] !== undefined) return ID_TZ[province];
  if (CTZ[country] !== undefined) return CTZ[country];
  return 420;
}

function getLocationTimezoneLabel() {
  const { country, province } = state;
  const ID_TZ = {
    'ID-BA': 'WITA', 'ID-NB': 'WITA', 'ID-NT': 'WITA',
    'ID-KS': 'WITA', 'ID-KI': 'WITA', 'ID-KU': 'WITA',
    'ID-SA': 'WITA', 'ID-GO': 'WITA', 'ID-ST': 'WITA', 'ID-SR': 'WITA',
    'ID-SN': 'WITA', 'ID-SG': 'WITA',
    'ID-MA': 'WIT', 'ID-MU': 'WIT',
    'ID-PA': 'WIT', 'ID-PB': 'WIT', 'ID-PS': 'WIT', 'ID-PT': 'WIT', 'ID-PP': 'WIT', 'ID-PD': 'WIT',
  };
  const CTZ = { MY: 'MYT', SG: 'SGT', PH: 'PHT', TH: 'ICT', BN: 'BNT', VN: 'ICT', LA: 'ICT', KH: 'ICT', TL: 'TLT', MM: 'MMT' };
  if (country === 'ID') {
    if (province && ID_TZ[province]) return ID_TZ[province];
    return 'WIB';
  }
  if (CTZ[country]) return CTZ[country];
  return 'UTC+7';
}

function updateClockDisplay() {
  const tzMin = getLocationTimezoneMinutes();
  const localMin = -new Date().getTimezoneOffset();
  const diffMs = (tzMin - localMin) * 60000;
  const now = new Date(Date.now() + diffMs);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const tzLabel = getLocationTimezoneLabel();
  const el = document.getElementById('next-prayer-time');
  const timeStr = `${h}:${m}:${s}`;
  if (timeStr === el.dataset.clock && tzLabel === el.dataset.tz) return;
  el.dataset.clock = timeStr;
  el.dataset.tz = tzLabel;
  el.innerHTML = `<span class="clock-digits">${h}:${m}:${s}</span><span class="clock-tz">${tzLabel}</span>`;
}

// ── Clock (independent interval, guaranteed to always tick) ──
let clockInterval = null;

function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    if (!isAppVisible) return;
    updateClockDisplay();
  }, 1000);
  updateClockDisplay();
}

function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

// ── Countdown ──
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (!isAppVisible) return;
  const interval = state.optimization ? 2000 : 1000;
  countdownInterval = setInterval(() => {
    if (!isAppVisible) return;
    updateCountdown();
    if (!state.optimization) {
      updateProgress();
    }
  }, interval);
  updateCountdown();
}




function isIshaNowPassed(tolMs = 2 * 60 * 1000) {
  if (!Array.isArray(prayers) || prayers.length === 0) return false;
  const now = new Date();
  const isha = prayers.find(p => p.key === 'isha');
  if (!isha?.date) return false;
  return (now.getTime() - isha.date.getTime()) > tolMs;
}

function shouldResyncForNextDay() {
  // Fokus request user: setelah melewati Isya, langsung update jadwal ke besok.
  // Masalah “stuck 00:00:00” biasanya karena jadwal yang tersisa masih mengarah ke subuh hari sebelumnya.
  // Solusi: kalau Isya sudah lewat (toleransi 1 menit) maka resync, sekali.
  return isIshaNowPassed(1 * 60 * 1000);
}

function updateCountdown() {
  const now = new Date();

  if (!prayers || prayers.length === 0) return;

  // Resync cepat setelah Isya lewat (agar jadwal besok ke-load, bukan stuck 00:00:00 Subuh).
  // Penting: calculateAndRender() saat ini selalu computeTimes(new Date()),
  // sehingga butuh mekanisme agar API dipanggil untuk “hari berikutnya” saat Isya sudah lewat.
  if (shouldResyncForNextDay()) {
    const dayKey = `nextday_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    if (!window.__resyncNextDayDone) { window.__resyncNextDayDone = new Set(); } else if (window.__resyncNextDayDone.size > 10) { window.__resyncNextDayDone.clear(); }

    if (!window.__resyncNextDayDone.has(dayKey)) {
      window.__resyncNextDayDone.add(dayKey);

      // Paksa hitung untuk besok dengan mengubah referensi tanggal
      // (menghindari resync yang tetap memakai jadwal “hari ini”).
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      const [lat, lng] = state.coords.split(',').map(Number);
      const locTz = getLocationTimezoneMinutes() / 60;

      document.getElementById('next-prayer-name').textContent = 'Memuat...';

      PrayerCalc.computeTimes(tomorrow, lat, lng, locTz, Number(state.method))
        .then((result) => {
          prayers = result.prayers;
          hijriDate = result.hijriDate;
          renderPrayerList();
          renderDates();
          updateNextPrayer();
          updateProgress();
          scheduleNextNotification();
          updateCountdown();
        })
        .catch(() => {
          calculateAndRender().then(() => updateCountdown()).catch(() => {});
        });

      return;
    }
  }

  // next prayer dihitung dari active prayer + 1 agar setelah Isya lewat langsung ke jadwal berikutnya.
  const idx = (getActivePrayerIndex() + 1) % prayers.length;
  const p = prayers[idx];

  // Trigger sync setelah fase “waktu sholat” lewat.
  if (p?.date) {
    const diffMs = p.date - now;
    const twoMin = 2 * 60 * 1000;

    const syncKey = `resync_${p.key}_${p.date?.getTime?.() ?? ''}`;
    if (!window.__resyncDoneKeys) { window.__resyncDoneKeys = new Set(); } else if (window.__resyncDoneKeys.size > 100) { window.__resyncDoneKeys.clear(); }

    // Kalau sudah melewati (lebih dari 2 menit), sync.
    if (diffMs <= -twoMin && !window.__resyncDoneKeys.has(syncKey)) {
      window.__resyncDoneKeys.add(syncKey);
      calculateAndRender().then(() => {
        updateCountdown();
      }).catch(() => {});
    }
  }

  if (!p?.date) return;

  const enableHint = state.hintShow !== false;
  let diff = p.date - now;

  const twoMin = 2 * 60 * 1000;

  // Dalam 2 menit setelah waktu sholat: tampilkan "Waktunya sholat" di countdown
  const activeIdx = getActivePrayerIndex();
  if (activeIdx >= 0) {
    const active = prayers[activeIdx];
    const sinceActive = now - active.date;
    if (sinceActive >= 0 && sinceActive < twoMin) {
      document.getElementById('next-prayer-name').textContent = active.name;
      showPrayerArrived(active);
      if (enableHint) {
        const hintPayload = formatHintPayload(active.name, active.time, -sinceActive);
        if (window.__lastHintKey !== hintPayload.title || window.__lastHintBody !== hintPayload.body) {
          window.__lastHintKey = hintPayload.title;
          window.__lastHintBody = hintPayload.body;
          ipcRenderer.send('hint-data', hintPayload);
        }
      }
      renderPrayerList();
      return;
    } else {
      hidePrayerArrived();
    }
  }

  if (diff < 0) {
    const first = prayers?.[0];
    document.getElementById('next-prayer-name').textContent = first?.name || '';

    if (enableHint) {
      ipcRenderer.send('hint-data', formatHintPayload(first?.name, first?.time, diff));
    }

    // resync sekali jika ini bukan resync loop
    if (!window.__initialResyncDone) {
      window.__initialResyncDone = true;
      calculateAndRender()
        .then(() => updateCountdown())
        .catch(() => { window.__initialResyncDone = false; });
      return;
    }

    // Dalam 2 menit setelah sholat: tampilkan 00:00:00
    if (diff >= -twoMin) {
      document.getElementById('cd-h').textContent = '00';
      document.getElementById('cd-m').textContent = '00';
      document.getElementById('cd-s').textContent = '00';
      renderPrayerList();
      return;
    }

    // Setelah 2 menit: lanjut ke countdown sholat berikutnya
    updateNextPrayer();
  } else {
    updateNextPrayer();
  }

  if (diff <= 0) {
    // After 2-min window, recalc diff for the actual next prayer
    const ni = getNextPrayerIndex();
    const np = prayers[ni];
    if (np?.date) {
      diff = np.date - now;
      if (diff <= 0) {
        // All prayers today have passed — estimate next day's first prayer
        diff = np.date.getTime() + 86400000 - now.getTime();
        if (diff <= 0) diff = 1;
      }
    } else {
      diff = 1;
    }
  }

  // ── Final safety: ensure diff is always > 0 ──
  if (diff <= 0) {
    const fi = getNextPrayerIndex();
    const fp = prayers[fi];
    if (fp?.date) {
      diff = fp.date - now;
      if (diff <= 0) diff = fp.date.getTime() + 86400000 - now.getTime();
    }
    if (diff <= 0) diff = 1;
  }

  const hintPayload = formatHintPayload(p.name, p.time, diff);
  if (enableHint && (window.__lastHintKey !== hintPayload.title || window.__lastHintBody !== hintPayload.body)) {
    window.__lastHintKey = hintPayload.title;
    window.__lastHintBody = hintPayload.body;
    ipcRenderer.send('hint-data', hintPayload);
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const cdh = String(h).padStart(2, '0');
  const cdm = String(m).padStart(2, '0');
  const cds = String(s).padStart(2, '0');
  // Reset cached values when countdown transitions from stuck 00:00:00
  if (cdh === '00' && cdm === '00' && cds === '00' && window.__cd_h === '00' && window.__cd_m === '00' && window.__cd_s === '00') {
    window.__cd_h = ''; window.__cd_m = ''; window.__cd_s = '';
  }
  if (cdh !== window.__cd_h) { document.getElementById('cd-h').textContent = cdh; window.__cd_h = cdh; }
  if (cdm !== window.__cd_m) { document.getElementById('cd-m').textContent = cdm; window.__cd_m = cdm; }
  if (cds !== window.__cd_s) { document.getElementById('cd-s').textContent = cds; window.__cd_s = cds; }

  if (s === 0 && !state.optimization) renderPrayerList();
}


// ── Progress bar ──
function updateProgress() {
  if (!prayers || prayers.length === 0) return;
  const now = new Date();
  const idx = getNextPrayerIndex();

  const prevIdx = idx === 0 ? prayers.length - 1 : idx - 1;
  const prevTime = prayers[prevIdx].date;
  const nextTime = prayers[idx].date;

  if (!prevTime || !nextTime) return;

  let total = nextTime - prevTime;
  let elapsed = now - prevTime;
  if (total <= 0) return;

  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ── Notifikasi (scheduler trigger tunggal) ──
let notificationTimeout = null;

function scheduleNextNotification() {
  if (!prayers || prayers.length === 0) {
    console.log('[notif] schedule skipped — no prayers');
    return;
  }

  const now = new Date();
  const remindMin = Number(state.remindMin || 0);
  const remindMs = remindMin * 60000;
  const onTimeWindowMs = 5 * 60 * 1000;

  let candidates = [];

  prayers.forEach(p => {
    if (!p.date || p.noNotif) return;
    if (!state.notifEnabled[p.key]) return;

    // reminder candidate
    if (remindMin > 0) {
      const reminderKey = `remind_${p.key}`;
      if (!notifiedKeys.has(reminderKey)) {
        const t = new Date(p.date.getTime() - remindMs);
        candidates.push({ type: 'remind', p, key: reminderKey, at: t });
      }
    }

    // on-time candidate
    const onTimeKey = `ontime_${p.key}`;
    if (!notifiedKeys.has(onTimeKey)) {
      candidates.push({ type: 'ontime', p, key: onTimeKey, at: new Date(p.date.getTime()) });
    }
  });

  if (candidates.length === 0) {
    console.log('[notif] no candidates available');
    return;
  }

  // Pilih event berikutnya (event paling dekat)
  candidates.sort((a, b) => a.at - b.at);
  const next = candidates[0];

  const delta = next.at - now;

  console.log('[notif] next candidate:', next.type, next.key, 'at', next.at.toLocaleTimeString(), 'delta(ms)=', delta);

  if (notificationTimeout) clearTimeout(notificationTimeout);

  // Kalau sudah lewat (misalnya app tidur), fire cepat, lalu reschedule.
  if (delta <= 0) {
    console.log('[notif] delta <= 0, firing immediately');
    fireNotificationCandidate(next, { onTimeWindowMs, now: new Date() });
    scheduleNextNotification();
    return;
  }

  notificationTimeout = setTimeout(() => {
    console.log('[notif] timeout fired for', next.key);
    fireNotificationCandidate(next, { onTimeWindowMs, now: new Date() });
    scheduleNextNotification();
  }, delta + 50);
}

function fireNotificationCandidate(candidate, { onTimeWindowMs, now }) {
  const { type, p, key } = candidate;
  if (!p || !p.date) { notifiedKeys.add(key); return; }

  if (type === 'remind') {
    const remindMin = Number(state.remindMin || 0);
    if (!(remindMin > 0)) { notifiedKeys.add(key); return; }

    const diff = p.date - now;
    const remindMs = remindMin * 60000;

    if (diff > 0 && diff <= remindMs) {
      notifiedKeys.add(key);
      dlog('reminder fired', p.key, 'diff(ms)=', diff);
      console.log('[reminder] FIRED:', p.key, 'diff(ms)=', diff, 'remindMin=', remindMin);
      const notif = getReminderNotificationStrings(remindMin, p.name, p.key);
      ipcRenderer.send('show-adhan', {
        name: p.name,
        arabic: '',
        time: '',
        title: notif.title,
        body: notif.body,
        lang: state.language,
      });
    } else {
      // Always mark as done so it never blocks future candidates
      notifiedKeys.add(key);
      console.log('[reminder] SKIPPED (too late):', p.key, 'diff(ms)=', diff);
    }
  } else if (type === 'ontime') {
    const diff = p.date - now;
    if (diff <= 0 && diff >= -onTimeWindowMs) {
      notifiedKeys.add(key);
      dlog('on-time fired', p.key, 'diff(ms)=', diff);
      const adhan = getAdhanNotificationStrings(p.name);
      ipcRenderer.send('show-adhan', { name: p.name, arabic: p.arabic, time: p.time, title: adhan.title, body: adhan.body, lang: state.language });
    } else {
      notifiedKeys.add(key);
      console.log('[notif] SKIPPED ontime (too late):', p.key, 'diff(ms)=', diff);
    }
  }
}


function sendNotif(title, body) {
  ipcRenderer.send('show-notification', { title, body });
}

// ── Settings UI ──
function setupUI() {
  document.addEventListener('simple-toggle-change', (e) => {
    const { key, checked } = e.detail || {};
    if (!key) return;

    if (key === 'hintBlur') state.hintBlur = !!checked;
    if (key === 'hintShow') state.hintShow = !!checked;
    if (key === 'cpuSaver') state.cpuSaver = !!checked;
    markUnsavedChanges();

    if (key === 'hintBlur' || key === 'hintShow') {
      ipcRenderer.send('hint-feature', { hintBlur: state.hintBlur, hintShow: state.hintShow });
    }

    if (key === 'hintShow' && !state.hintShow) {
      ipcRenderer.send('hint-hide', {});
    }
  });

  document.getElementById('btn-minimize').onclick = () => ipcRenderer.send('minimize-window');
  document.getElementById('btn-close').onclick = () => {
    if (hasUnsavedChanges) {
      const message = lang() === 'id'
        ? 'Ada perubahan yang belum disimpan. Simpan dulu sebelum keluar.'
        : 'There are unsaved changes. Save first before exiting.';
      showInAppNotification(message);
      return;
    }
    ipcRenderer.send('close-window');
  };

  document.getElementById('btn-settings').onclick = () => {
    document.getElementById('settings-panel').classList.add('open');
    renderNotifToggles();
    hasUnsavedChanges = false;
  };

  document.getElementById('close-settings').onclick = () => {
    if (hasUnsavedChanges) {
      const message = lang() === 'id'
        ? 'Ada perubahan yang belum disimpan. Simpan dulu sebelum keluar.'
        : 'There are unsaved changes. Save first before exiting.';
      showInAppNotification(message);
      return;
    }
    document.getElementById('settings-panel').classList.remove('open');
  };

  document.getElementById('save-settings').onclick = saveSettingsHandler;

  document.getElementById('language-select').onchange = (e) => {
    state.language = e.target.value === 'en' ? 'en' : 'id';
    applyLanguage();
    applySettings();
    renderDates();
    renderNotifToggles();
    updateNextPrayer();
    loadAppMeta();
    markUnsavedChanges();
  };

  // Cascading location selects
  document.getElementById('country-select').onchange = function(e) {
    const val = e.target.value;
    const phProvince = lang() === 'id' ? 'Pilih Provinsi' : 'Select Province';
    const phCity = lang() === 'id' ? 'Pilih Kota/Kabupaten' : 'Select City';
    const phDistrict = lang() === 'id' ? 'Pilih Kecamatan' : 'Select District';
    document.getElementById('province-group').style.display = val ? '' : 'none';
    document.getElementById('city-group').style.display = 'none';
    document.getElementById('district-group').style.display = 'none';
    if (val) {
      const provinces = RegionData.getProvinces(val);
      populateSelect('province-select', provinces, '', phProvince);
    } else {
      populateSelect('province-select', [], '', phProvince);
      populateSelect('city-select', [], '', phCity);
      populateSelect('district-select', [], '', phDistrict);
    }
    populateMethodSelect(val);
    const methods = METHODS_BY_COUNTRY[val] || METHODS_BY_COUNTRY._default;
    state.method = methods[0].id;
    document.getElementById('method-select').value = state.method;
    markUnsavedChanges();
  };
  document.getElementById('province-select').onchange = function(e) {
    const val = e.target.value;
    const phCity = lang() === 'id' ? 'Pilih Kota/Kabupaten' : 'Select City';
    const phDistrict = lang() === 'id' ? 'Pilih Kecamatan' : 'Select District';
    document.getElementById('city-group').style.display = val ? '' : 'none';
    document.getElementById('district-group').style.display = 'none';
    if (val) {
      const cities = RegionData.getCities(val);
      const provName = RegionData.getProvince(val)?.name || '';
      const fbCity = lang() === 'id' ? provName + ' (Pusat)' : provName + ' (Center)';
      populateSelect('city-select', cities, '', phCity, fbCity);
    } else {
      populateSelect('city-select', [], '', phCity);
      populateSelect('district-select', [], '', phDistrict);
    }
    markUnsavedChanges();
  };
  document.getElementById('city-select').onchange = function(e) {
    const val = e.target.value;
    const phDistrict = lang() === 'id' ? 'Pilih Kecamatan' : 'Select District';
    document.getElementById('district-group').style.display = 'none';
    if (val) {
      const districts = RegionData.getDistricts(val);
      if (districts.length > 0) {
        populateSelect('district-select', districts, '', phDistrict);
        document.getElementById('district-group').style.display = '';
      } else {
        populateSelect('district-select', [], '', phDistrict);
      }
    } else {
      populateSelect('district-select', [], '', phDistrict);
    }
    markUnsavedChanges();
  };
  document.getElementById('district-select').onchange = markUnsavedChanges;
  document.getElementById('method-select').onchange = markUnsavedChanges;
  document.getElementById('reminder-minutes').onchange = markUnsavedChanges;

  document.getElementById('test-adhan').onclick = () => {
    const prayerKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const randomKey = prayerKeys[Math.floor(Math.random() * prayerKeys.length)];
    const prayerName = PRAYER_NAMES[lang()][randomKey];
    const arabicName = PRAYER_ARABIC[randomKey];
    const matched = prayers?.find(p => p.key === randomKey);
    const time = matched?.time || '--:--';
    const adhan = getAdhanNotificationStrings(prayerName, arabicName);
    ipcRenderer.send('show-adhan', { name: prayerName, arabic: arabicName, time, title: adhan.title, body: adhan.body, lang: state.language });
    const msg = lang() === 'en' ? 'Test notification sent' : 'Test notifikasi terkirim';
    showInAppNotification(msg);
  };

  document.getElementById('test-reminder').onclick = () => {
    try {
      const prayerKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const randomKey = prayerKeys[Math.floor(Math.random() * prayerKeys.length)];
      const rPrayerName = PRAYER_NAMES[lang()][randomKey];
      const remindMin = Math.max(1, Number(state.remindMin) || 5);
      const notif = getReminderNotificationStrings(remindMin, rPrayerName, randomKey);
      ipcRenderer.send('show-adhan', {
        name: rPrayerName,
        arabic: '',
        time: `${remindMin} ${lang() === 'en' ? 'min before' : 'menit sebelum'}`,
        title: notif.title,
        body: notif.body,
        lang: state.language,
      });
      const msg = lang() === 'en' ? `Reminder test sent` : `Test pengingat terkirim`;
      showInAppNotification(msg);
    } catch (e) {
      console.error('test-reminder error:', e);
    }
  };

  document.getElementById('optimization-checkbox').onchange = function() {
    toggleOptimization(this.checked);
  };

  document.getElementById('btn-donate').onclick = () => {
    window.electronAPI.openExternal('https://saweria.co/Arza707');
  };
}

function renderNotifToggles() {
  const prayers6 = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const names = { ...tr().notifNames };
  if (new Date().getDay() === 5) names.dhuhr = lang() === 'id' ? "Jum'at" : "Jumu'ah";
  const container = document.getElementById('notif-toggles');

  if (container.children.length === 0) {
    prayers6.forEach(k => {
      const label = document.createElement('label');
      label.className = 'toggle-item';
      label.dataset.key = k;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.onchange = function() { toggleNotif(k, this.checked); };
      label.appendChild(cb);
      container.appendChild(label);
    });
  }
  prayers6.forEach(k => {
    const label = container.querySelector(`.toggle-item[data-key="${k}"]`);
    if (!label) return;
    const on = !!state.notifEnabled[k];
    label.classList.toggle('on', on);
    label.querySelector('input').checked = on;
    const tn = label.lastChild;
    if (!tn || tn.nodeType !== Node.TEXT_NODE) {
      label.appendChild(document.createTextNode(names[k]));
    } else {
      tn.textContent = names[k];
    }
  });
}

function toggleNotif(key, val) {
  state.notifEnabled[key] = val;
  document.querySelector(`.toggle-item[data-key="${key}"]`).classList.toggle('on', val);
  markUnsavedChanges();
}

function toggleOptimization(val) {
  state.optimization = val;
  document.body.classList.toggle('optimized', !!val);
  const wrapper = document.getElementById('toggle-optimization-wrapper');
  if (wrapper) wrapper.classList.toggle('on', val);
  const gf = document.getElementById('google-fonts');
  if (val && gf) gf.remove();
  renderPrayerList();
  startCountdown();
  markUnsavedChanges();
}

function saveSettingsHandler() {
  const countryEl = document.getElementById('country-select');
  const provinceEl = document.getElementById('province-select');
  const cityEl = document.getElementById('city-select');
  const districtEl = document.getElementById('district-select');

  // Validate required fields
  if (!countryEl.value || !provinceEl.value || !cityEl.value) {
    const msg = lang() === 'id'
      ? 'Harap pilih Negara, Provinsi, dan Kota/Kabupaten.'
      : 'Please select Country, Province, and City.';
    showInAppNotification(msg);
    return;
  }

  state.country = countryEl.value;
  state.province = provinceEl.value;
  state.city = cityEl.value;
  state.district = districtEl.value || '';
  state.language = document.getElementById('language-select').value === 'en' ? 'en' : 'id';
  state.method = Number(document.getElementById('method-select').value);
  state.remindMin = Number(document.getElementById('reminder-minutes').value);

  // Derive coords from selected location
  const coords = RegionData.getCoords(state.country, state.province, state.city, state.district);
  if (coords) {
    state.coords = coords.lat + ',' + coords.lng;
  }

  saveState();

  notifiedKeys.clear();
  applySettings();
  calculateAndRender().then(() => {
    startCountdown();
  });

  hasUnsavedChanges = false;
  document.getElementById('settings-panel').classList.remove('open');

  const message = lang() === 'id'
    ? 'Semua perubahan telah tersimpan.'
    : 'All changes have been saved.';
  showInAppNotification(message);

  location.reload();
}

init();


/**
 * prayer.js — Ambil jadwal sholat dari Aladhan API
 * API: https://aladhan.com/prayer-times-api
 * Akurat, sama seperti yang dipakai Google
 */

const PrayerCalc = (() => {
  const icons = {
    fajr: '🌙', sunrise: '🌅', dhuhr: '☀️',
    asr: '🌤', maghrib: '🌇', isha: '🌌'
  };

  const CACHE_PREFIX = 'sholat-times-v2:';

  function getCacheKey(date, lat, lng, timezone, method, countryCode, cityName) {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return CACHE_PREFIX + [
      dateKey,
      Number(lat).toFixed(4),
      Number(lng).toFixed(4),
      timezone,
      method,
      countryCode || '',
      cityName || '',
    ].join(':');
  }

  function readCache(key) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (!Array.isArray(cached?.prayers) || cached.prayers.length !== 6) return null;
      const prayers = cached.prayers.map(prayer => ({
        ...prayer,
        date: new Date(prayer.date),
      }));
      if (prayers.some(prayer => !prayer.time || Number.isNaN(prayer.date.getTime()))) return null;
      return { prayers, hijriDate: cached.hijriDate || '' };
    } catch {
      return null;
    }
  }

  function writeCache(key, result) {
    try {
      localStorage.setItem(key, JSON.stringify(result));
    } catch (error) {
      console.warn('Unable to cache prayer times:', error);
    }
  }

  async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Prayer API returned HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function parseTime(str, date, timezone) {
    const match = String(str || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const dt = new Date(date);
    const userOffset = -dt.getTimezoneOffset();
    const locOffset = timezone * 60;
    dt.setHours(hh, mm, 0, 0);
    dt.setMinutes(dt.getMinutes() - (locOffset - userOffset));
    return dt;
  }

  function buildResult(date, timezone, timings, hijriDate) {
    const prayerTimes = [
      ['fajr', 'Subuh', 'الفجر', icons.fajr, timings.Fajr || timings.subuh],
      ['sunrise', 'Syuruq', 'الشروق', icons.sunrise, timings.Sunrise || timings.terbit],
      ['dhuhr', 'Dzuhur', 'الظهر', icons.dhuhr, timings.Dhuhr || timings.dzuhur],
      ['asr', 'Ashar', 'العصر', icons.asr, timings.Asr || timings.ashar],
      ['maghrib', 'Maghrib', 'المغرب', icons.maghrib, timings.Maghrib || timings.maghrib],
      ['isha', 'Isya', 'العشاء', icons.isha, timings.Isha || timings.isya],
    ];

    const prayers = prayerTimes.map(([key, name, arabic, icon, time]) => ({
      key,
      name,
      arabic,
      icon,
      time: String(time || '').match(/\d{1,2}:\d{2}/)?.[0] || '',
      date: parseTime(time, date, timezone),
    }));

    if (prayers.some(prayer => !prayer.time || !prayer.date)) {
      throw new Error('Prayer API response is missing one or more prayer times');
    }
    return { prayers, hijriDate };
  }

  async function computeIndonesianFallback(date, timezone, cityName, timeoutMs) {
    if (!cityName) throw new Error('A city name is required for the Indonesian fallback');

    const cityUrl = `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(cityName)}`;
    const cityResponse = await fetchJson(cityUrl, timeoutMs);
    const cities = cityResponse?.status === true && Array.isArray(cityResponse.data)
      ? cityResponse.data
      : [];
    const normalizedName = cityName.toLocaleUpperCase('id-ID').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const matchingCities = cities.filter(city => {
      const location = String(city.lokasi || '').toLocaleUpperCase('id-ID');
      return location.replace(/^(KOTA|KABUPATEN|KAB)\s*/i, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() === normalizedName;
    });
    const city = matchingCities.find(item => /^KOTA\b/i.test(item.lokasi))
      || matchingCities[0]
      || cities[0];
    if (!city?.id) throw new Error(`No Indonesian prayer schedule found for ${cityName}`);

    const url = `https://api.myquran.com/v2/sholat/jadwal/${encodeURIComponent(city.id)}/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    const scheduleResponse = await fetchJson(url, timeoutMs);
    const schedule = scheduleResponse?.status === true ? scheduleResponse.data?.jadwal : null;
    if (!schedule) throw new Error('Indonesian prayer schedule response is invalid');

    const hijriDate = typeof toHijri === 'function' ? toHijri(date) : '';
    return buildResult(date, timezone, schedule, hijriDate);
  }

  function computeLocalFallback(date, lat, lng, timezone, method) {
    if (![lat, lng, timezone].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error('Invalid coordinates or timezone for local prayer calculation');
    }

    const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
    const equationOfTime = 229.18 * (
      0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma)
    );
    const declination = 0.006918
      - 0.399912 * Math.cos(gamma)
      + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma)
      + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma)
      + 0.00148 * Math.sin(3 * gamma);

    const methodAngles = {
      3: [18, 17],
      11: [20, 18],
      17: [20, 18],
      20: [20, 18],
      101: [20, 18],
      102: [18, 17],
      103: [20, 18],
      104: [20, 18],
      105: [20, 18],
    };
    const angles = methodAngles[method] || [18, 17];
    const latitude = lat * Math.PI / 180;
    const declinationDegrees = declination * 180 / Math.PI;
    const solarNoon = 720 - 4 * lng - equationOfTime + timezone * 60;

    function hourAngleForAltitude(altitudeDegrees) {
      const altitude = altitudeDegrees * Math.PI / 180;
      const cosine = (
        Math.sin(altitude) - Math.sin(latitude) * Math.sin(declination)
      ) / (Math.cos(latitude) * Math.cos(declination));
      return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
    }

    function formatLocalTime(minutes) {
      const rounded = ((Math.round(minutes) % 1440) + 1440) % 1440;
      return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
    }

    const sunriseHourAngle = hourAngleForAltitude(-0.833);
    const asrAltitude = Math.atan(
      1 / (1 + Math.tan(Math.abs(latitude - declination))),
    ) * 180 / Math.PI;
    const asrHourAngle = hourAngleForAltitude(asrAltitude);
    const localTimings = {
      Fajr: formatLocalTime(solarNoon - hourAngleForAltitude(-angles[0]) * 4),
      Sunrise: formatLocalTime(solarNoon - sunriseHourAngle * 4),
      Dhuhr: formatLocalTime(solarNoon),
      Asr: formatLocalTime(solarNoon + asrHourAngle * 4),
      Maghrib: formatLocalTime(solarNoon + sunriseHourAngle * 4),
      Isha: formatLocalTime(solarNoon + hourAngleForAltitude(-angles[1]) * 4),
    };

    return buildResult(
      date,
      timezone,
      localTimings,
      typeof toHijri === 'function' ? toHijri(date) : '',
    );
  }

  async function computeTimes(date, lat, lng, timezone, method, countryCode, cityName) {
    const cacheKey = getCacheKey(date, lat, lng, timezone, method, countryCode, cityName);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    let indonesiaError = null;
    if (countryCode === 'ID' && method === 20) {
      try {
        const result = await computeIndonesianFallback(date, timezone, cityName, 4000);
        writeCache(cacheKey, result);
        return result;
      } catch (error) {
        indonesiaError = error;
        console.warn('Kemenag schedule source failed; falling back to Aladhan:', error);
      }
    }

    const methodMap = { 3: 3, 11: 11, 17: 17, 20: 20, 104: 20 };
    const customAngles = {
      101: { fajr: 20, isha: 18 },
      102: { fajr: 18, isha: 17 },
      103: { fajr: 20, isha: 18 },
      105: { fajr: 20, isha: 18 },
    };

    const d   = String(date.getDate()).padStart(2,'0');
    const m   = String(date.getMonth() + 1).padStart(2,'0');
    const y   = date.getFullYear();

    let url;
    const angles = customAngles[method];
    if (angles) {
      const methodSettings = `${angles.fajr},null,${angles.isha},null`;
      url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=99&methodSettings=${methodSettings}`;
    } else {
      const aladhanMethod = methodMap[method] || 20;
      url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=${aladhanMethod}`;
    }

    const requestDeadline = Date.now() + 4000;
    const remainingTime = () => Math.max(1, requestDeadline - Date.now());
    const hasTimeRemaining = () => Date.now() < requestDeadline;

    try {
      const json = await fetchJson(url, remainingTime());
      if (json.code !== 200 || !json.data?.timings) {
        throw new Error(`Aladhan API error: ${json.status || 'invalid response'}`);
      }

      const hijri = json.data.date?.hijri;
      const hijriDate = hijri
        ? `${hijri.day} ${hijri.month.en} ${hijri.year}`
        : (typeof toHijri === 'function' ? toHijri(date) : '');
      const result = buildResult(date, timezone, json.data.timings, hijriDate);
      writeCache(cacheKey, result);
      return result;
    } catch (error) {
      if (countryCode === 'ID' && method !== 20 && method !== 105 && hasTimeRemaining()) {
        try {
          const result = await computeIndonesianFallback(date, timezone, cityName, remainingTime());
          writeCache(cacheKey, result);
          return result;
        } catch (fallbackError) {
          indonesiaError = fallbackError;
        }
      }

      try {
        return computeLocalFallback(date, lat, lng, timezone, method);
      } catch (fallbackError) {
        const indonesiaDetails = indonesiaError ? `; Indonesian fallback failed (${indonesiaError.message})` : '';
        throw new Error(`Aladhan failed (${error.message})${indonesiaDetails}; local calculation failed (${fallbackError.message})`);
      }
    }
  }

  return { computeTimes };
})();

function toHijri(date) {
  const jd  = Math.floor((date.getTime() / 86400000) + 2440587.5) + 0.5;
  const jdH = jd - 1948439.5;
  const hYear  = Math.floor((30 * jdH + 10646) / 10631);
  const hMonth = Math.min(12, Math.ceil((jdH - 29.5 * Math.floor((11 * hYear + 3) / 30) + 1948439.5 - 1948440) / 29.5 + 1));
  const hDay   = Math.ceil(jdH - 29.5 * Math.floor((11 * hYear + 3) / 30) - 1948440 + Math.ceil((hMonth - 1) * 29.5) + 1);
  const names  = ['Muharram','Safar',"Rabi'ul Awal","Rabi'ul Akhir",'Jumadil Awal','Jumadil Akhir','Rajab',"Sya'ban",'Ramadhan','Syawal',"Dzulqa'dah",'Dzulhijjah'];
  return `${hDay} ${names[hMonth - 1]} ${hYear} H`;
}

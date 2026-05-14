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

  async function computeTimes(date, lat, lng, timezone, method) {
    const methodMap = { 3: 3, 11: 11, 17: 17, 20: 20, 104: 20 };
    const customAngles = {
      101: { fajr: 20, isha: 18 },
      102: { fajr: 18, isha: 17 },
      103: { fajr: 20, isha: 18 },
    };

    const d   = String(date.getDate()).padStart(2,'0');
    const m   = String(date.getMonth() + 1).padStart(2,'0');
    const y   = date.getFullYear();

    let url;
    const angles = customAngles[method];
    if (angles) {
      url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=99&fajrAngle=${angles.fajr}&ishaAngle=${angles.isha}&timezone=${timezone}`;
    } else {
      const aladhanMethod = methodMap[method] || 20;
      url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=${aladhanMethod}&timezone=${timezone}`;
    }

    const res  = await fetch(url);
    const json = await res.json();

    if (json.code !== 200) throw new Error('API error: ' + json.status);

    const t = json.data.timings;

    function parseTime(str) {
      const m = String(str).match(/(\d{1,2}):(\d{2})/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      const dt = new Date(date);
      const userOffset = -dt.getTimezoneOffset();
      const locOffset = timezone * 60;
      dt.setHours(hh, mm, 0, 0);
      dt.setMinutes(dt.getMinutes() - (locOffset - userOffset));
      return dt;
    }

    const hijri = json.data.date.hijri;
    const hijriDate = `${hijri.day} ${hijri.month.en} ${hijri.year}`;

    return {
      prayers: [
        { key: 'fajr',    name: 'Subuh',   arabic: 'الفجر',  icon: icons.fajr,    time: t.Fajr,    date: parseTime(t.Fajr) },
        { key: 'sunrise', name: 'Syuruq',  arabic: 'الشروق', icon: icons.sunrise, time: t.Sunrise, date: parseTime(t.Sunrise) },
        { key: 'dhuhr',   name: 'Dzuhur',  arabic: 'الظهر',  icon: icons.dhuhr,   time: t.Dhuhr,   date: parseTime(t.Dhuhr) },
        { key: 'asr',     name: 'Ashar',   arabic: 'العصر',  icon: icons.asr,     time: t.Asr,     date: parseTime(t.Asr) },
        { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب', icon: icons.maghrib, time: t.Maghrib, date: parseTime(t.Maghrib) },
        { key: 'isha',    name: 'Isya',    arabic: 'العشاء', icon: icons.isha,    time: t.Isha,    date: parseTime(t.Isha) },
      ],
      hijriDate
    };
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

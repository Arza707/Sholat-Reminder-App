const params = new URLSearchParams(location.search);
const name = params.get('name') || 'Sholat';
const time = params.get('time') || '';
const lang = (params.get('lang') || 'id') === 'en' ? 'en' : 'id';

const arabic = params.get('arabic');
const title = params.get('title');
const body = params.get('body');

const badgeEl = document.getElementById('badge');
const descEl = document.getElementById('desc');
document.getElementById('name').textContent = name;
const arabicEl = document.getElementById('arabic-name');
if (arabic) arabicEl.textContent = arabic;

if (title) badgeEl.textContent = title;
else badgeEl.textContent = lang === 'en' ? 'Prayer Time' : 'Waktu Sholat';

if (body) descEl.textContent = body;
else descEl.textContent = lang === 'en'
  ? 'Allahu Akbar — It\'s time for prayer.'
  : 'Allahu Akbar — Saatnya menunaikan sholat.';

const timePrefix = lang === 'en' ? 'Time' : 'Pukul';
document.getElementById('time').textContent = time ? `${timePrefix} ${time}` : '';

document.querySelector('.close').addEventListener('click', () => window.close());

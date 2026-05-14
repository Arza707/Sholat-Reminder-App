const ipcRenderer = window.electronAPI;
const card = document.getElementById('hint-card');
const titleEl = document.getElementById('hint-title');
const bodyEl = document.getElementById('hint-body');

ipcRenderer.on('hint-update', (event, data) => {
  if (titleEl && bodyEl) {
    titleEl.textContent = data.title || 'Sholat Reminder';
    bodyEl.textContent = data.body || 'Gerakkan kursor ke bagian atas layar untuk melihat info sholat berikutnya.';
    bodyEl.classList.toggle('hidden', !data.body);
  }
});

ipcRenderer.on('hint-show', () => {
  card.classList.add('visible');
});

ipcRenderer.on('hint-hide', () => {
  card.classList.remove('visible');
});

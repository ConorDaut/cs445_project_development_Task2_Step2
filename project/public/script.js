// public/script.js
document.addEventListener('DOMContentLoaded', () => {
  const dataEl = document.getElementById('data-json');
  if (dataEl) {
    try {
      const data = JSON.parse(dataEl.textContent || '{}');
      window.pageData = data;
    } catch (e) {}
  }
});

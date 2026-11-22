(function () {
  try {
    var stored = localStorage.getItem('mcl-theme');
    var prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored !== 'light' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
})();

/* BUDGET v0.2 STABLE — native-visible startup with longer centered title hold, no deferred show. */
(() => {
  'use strict';
  const root = document.documentElement;
  let settled = false;
  let holdingMessageTimer = window.setTimeout(() => {
    if (settled) return;
    const status = document.getElementById('budgetStartupStatus');
    if (status) status.textContent = 'ЗАГРУЗКА ЗАНИМАЕТ БОЛЬШЕ ВРЕМЕНИ';
  }, 8000);
  const clear = () => window.clearTimeout(holdingMessageTimer);
  const ready = () => {
    if (settled) return;
    settled = true;
    clear();
    // Allow the renderer to paint all initialized dashboard data, then reveal.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        root.dataset.budgetStartup = 'revealing';
        window.setTimeout(() => {
          root.dataset.budgetStartup = 'complete';
          document.dispatchEvent(new CustomEvent('budget-startup-complete'));
        }, 630);
      }, 980);
    }));
  };
  const fail = error => {
    if (settled) return;
    settled = true;
    clear();
    root.dataset.budgetStartup = 'failed';
    console.error('[Budget] Startup preview failed', error);
  };
  window.__budgetStartup = {ready, fail};
})();

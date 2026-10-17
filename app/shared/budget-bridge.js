(() => {
  'use strict';

  const tauri = window.__TAURI__;
  if (!tauri?.core?.invoke) {
    console.error('[Budget] Tauri API is unavailable.');
    window.__budgetReady = Promise.reject(new Error('Tauri API is unavailable.'));
    return;
  }

  const invoke = tauri.core.invoke;
  document.documentElement.style.setProperty('background', '#020203', 'important');
  document.documentElement.style.setProperty('color-scheme', 'dark', 'important');

  // Static chrome is parsed as the first BODY element, before all app content.
  // Keep handlers separate from presentation so CSS/controls cannot flicker.
  function installTitlebar() {
    const host = document.getElementById('budgetCustomTitlebar');
    const minimize = document.getElementById('budgetWindowMinimize');
    const close = document.getElementById('budgetWindowClose');
    if (!host || !minimize || !close || host.dataset.controlsBound === '1') return;
    host.dataset.controlsBound = '1';
    minimize.addEventListener('click', () => {
      invoke('window_minimize').catch(error => console.error('[Budget] minimize failed', error));
    });
    close.addEventListener('click', () => {
      invoke('window_close').catch(error => console.error('[Budget] close failed', error));
    });
  }

  async function setupDatabase() {
    await invoke('budget_storage_preflight');
    let bootstrapCache = await invoke('budget_get_bootstrap');
    const refreshBootstrap = async () => {
      bootstrapCache = await invoke('budget_get_bootstrap');
      return bootstrapCache;
    };

    window.budgetDatabase = {
      getBootstrapSync: () => bootstrapCache,
      getTransactions: (limit, userId, period, categoryIds = []) => invoke('budget_get_transactions', {
        limit: Number(limit) || 0,
        userId: Number(userId),
        period: String(period || ''),
        categoryIds: (categoryIds || []).map(Number)
      }),
      getSummary: (period, userId, categoryIds = []) => invoke('budget_get_summary', {
        period: String(period || ''),
        userId: Number(userId),
        categoryIds: (categoryIds || []).map(Number)
      }),
      getAccountStats: userId => invoke('budget_get_account_stats', { userId:Number(userId) }),
      getCategoryStats: userId => invoke('budget_get_category_stats', { userId:Number(userId) }),
      getMonthlyCategoryStats: (period, userId, categoryIds = []) => invoke('budget_get_monthly_category_stats', {
        period: String(period || ''),
        userId: Number(userId),
        categoryIds: (categoryIds || []).map(Number)
      }),
      getMonthlyAccountStats: (period, userId, categoryIds = []) => invoke('budget_get_monthly_account_stats', {
        period: String(period || ''),
        userId: Number(userId),
        categoryIds: (categoryIds || []).map(Number)
      }),
      addTransaction: input => invoke('budget_add_transaction', { input }),
      deleteTransaction: (id, userId) => invoke('budget_delete_transaction', { id:Number(id), userId:Number(userId) }),
      addAccount: async (name, openingBalanceCents, userId) => {
        const result = await invoke('budget_add_account', {
          name: String(name),
          openingBalanceCents: Number(openingBalanceCents) || 0,
          userId: Number(userId)
        });
        await refreshBootstrap();
        return result;
      },
      archiveAccount: async (id, userId) => {
        const result = await invoke('budget_archive_account', { id:Number(id), userId:Number(userId) });
        await refreshBootstrap();
        return result;
      },
      renameAccount: async (id, name, userId) => {
        const result = await invoke('budget_rename_account', { id:Number(id), name:String(name), userId:Number(userId) });
        await refreshBootstrap();
        return result;
      },
      addCategory: async (name, kind) => {
        const result = await invoke('budget_add_category', { name:String(name), kind:String(kind) });
        await refreshBootstrap();
        return result;
      },
      deleteCategory: async id => {
        const result = await invoke('budget_delete_category', { id:Number(id) });
        await refreshBootstrap();
        return result;
      }
    };

    return true;
  }

  const startChrome = () => installTitlebar();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startChrome, { once:true });
  } else {
    startChrome();
  }

  window.__budgetReady = setupDatabase().catch(async error => {
    console.error('[Budget] bootstrap failed', error);
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once:true }));
    }
    installTitlebar();
    throw error;
  });
})();

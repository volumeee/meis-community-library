import type { TranslationDictionary } from '../../i18n/translations';

export function getStockStatus(stock: number, catalog: TranslationDictionary['catalog']) {
  if (stock === 0) {
    return {
      statusLabel: catalog.statusOut,
      statusClass: 'text-red-700 dark:text-red-400',
    };
  }
  if (stock <= 2) {
    return {
      statusLabel: catalog.statusLow,
      statusClass: 'text-amber-700 dark:text-amber-400',
    };
  }
  return {
    statusLabel: catalog.statusAvailable,
    statusClass: 'text-emerald-700 dark:text-emerald-400',
  };
}

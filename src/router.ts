import { useSyncExternalStore } from 'react';

// Мини-роутер на hash (#/events): работает на GitHub Pages без настройки сервера
// и поддерживает кнопку «назад» в браузере и на телефоне.

const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
};

const getPath = () => window.location.hash.replace(/^#/, '') || '/';

let navigatedInApp = false;

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getPath);
}

export function navigate(path: string) {
  if (getPath() === path) return;
  navigatedInApp = true;
  window.location.hash = path;
}

/** Назад по истории; если экран открыт по прямой ссылке, ведёт на запасной путь */
export function goBack(fallback = '/') {
  if (navigatedInApp) {
    window.history.back();
  } else {
    window.location.replace(`#${fallback}`);
  }
}

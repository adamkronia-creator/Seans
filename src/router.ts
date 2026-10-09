import { useSyncExternalStore } from 'react';
import { transition, type TransitionKind } from './utils/transition';

/*
 * Мини-роутер на hash (#/events): работает на GitHub Pages без настройки сервера
 * и поддерживает кнопку «назад» в браузере и на телефоне.
 * Каждая запись истории помечена номером шага (history.state.i): по нему видно, куда идёт переход — вперёд или назад,
 * и от этого зависит, в какую сторону уезжает экран. Запись без номера (адрес вписали руками) открывается без анимации.
 */

const readPath = () => window.location.hash.replace(/^#/, '') || '/';
const readStep = (): number | undefined => {
  const i = (window.history.state as { i?: unknown } | null)?.i;
  return typeof i === 'number' ? i : undefined;
};

/** Какой экран показан сейчас */
let shown = readPath();
/** Куда идём: экран меняется на кадр позже, когда браузер снял прежний, а повторные вызовы должны это видеть сразу */
let target = shown;
/** Номер текущей записи истории: 0 — та, с которой открыли приложение */
let step = readStep() ?? 0;
if (readStep() === undefined) window.history.replaceState({ i: step }, '');

const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

function show(path: string, kind: TransitionKind) {
  target = path;
  transition(() => {
    shown = path;
    listeners.forEach((listener) => listener());
  }, kind);
}

/** Браузер сам перешёл по истории (кнопка «назад»/«вперёд», свайп) или поменяли адрес руками */
function onHistory(event: Event) {
  const path = readPath();
  let i = readStep();
  let kind: TransitionKind;
  if (i === undefined) {
    // Запись создал сам браузер (вписали адрес): нумеруем её и показываем сразу
    i = step + 1;
    window.history.replaceState({ i }, '');
    kind = 'none';
  } else {
    kind = i < step ? 'back' : i > step ? 'forward' : 'fade';
  }
  step = i;
  // Свайп «назад» в Safari уже показал свою анимацию: вторую поверх не нужно
  if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) kind = 'none';
  if (path !== target) show(path, kind);
}

window.addEventListener('popstate', onHistory);
window.addEventListener('hashchange', onHistory);

export function useRoute(): string {
  return useSyncExternalStore(subscribe, () => shown);
}

/** Открыть экран по адресу; по умолчанию он выезжает справа, как при переходе вглубь */
export function navigate(path: string, kind: TransitionKind = 'forward') {
  if (target === path) return;
  step += 1;
  window.history.pushState({ i: step }, '', `#${path}`);
  show(path, kind);
}

/** Назад по истории; если экран открыт по прямой ссылке, ведёт на запасной путь */
export function goBack(fallback = '/') {
  if (step > 0) {
    window.history.back();
  } else if (target !== fallback) {
    window.history.replaceState({ i: step }, '', `#${fallback}`);
    show(fallback, 'back');
  }
}

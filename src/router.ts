import { useSyncExternalStore } from 'react';
import { transition, type TransitionKind } from './utils/transition';

/*
 * Мини-роутер на hash (#/events): работает на GitHub Pages без настройки сервера
 * и поддерживает кнопку «назад» в браузере и на телефоне.
 * Каждая запись истории помечена номером шага (history.state.i): по нему видно, куда идёт переход — вперёд или назад,
 * и от этого зависит, в какую сторону уезжает экран. Запись без номера (адрес вписали руками) открывается без анимации.
 * Ещё в записи лежит адрес экрана, с которого пришли (history.state.prev): им «назад» подсказывает, что под текущим экраном
 * (жест от левого края тянет экран и показывает под ним тот, куда вернёмся), и он переживает перезагрузку страницы.
 */

/** Какой экран показан и откуда на него пришли; prev нет, если экран открыт по прямой ссылке */
export interface Located {
  path: string;
  prev: string | undefined;
}

const readPath = () => window.location.hash.replace(/^#/, '') || '/';
const readState = (): { i: number | undefined; prev: string | undefined } => {
  const state = window.history.state as { i?: unknown; prev?: unknown } | null;
  return {
    i: typeof state?.i === 'number' ? state.i : undefined,
    prev: typeof state?.prev === 'string' ? state.prev : undefined,
  };
};

const initial = readState();
/** Какой экран показан сейчас (объект меняется целиком, поэтому годится как снимок для React) */
let shown: Located = { path: readPath(), prev: initial.prev };
/** Куда идём: экран меняется на кадр позже, когда браузер снял прежний, а повторные вызовы должны это видеть сразу */
let target = shown.path;
/** Номер текущей записи истории: 0 — та, с которой открыли приложение */
let step = initial.i ?? 0;
if (initial.i === undefined) window.history.replaceState({ i: step }, '');

const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

function show(path: string, kind: TransitionKind, prev: string | undefined) {
  target = path;
  transition(() => {
    shown = { path, prev };
    listeners.forEach((listener) => listener());
  }, kind);
}

/** Как показать переход назад, который начали мы сами (кнопка «назад» браузера и свайп сообщают о нём только событием) */
let forced: { kind: TransitionKind; until: number } | undefined;

/** Браузер сам перешёл по истории (кнопка «назад»/«вперёд», свайп) или поменяли адрес руками */
function onHistory(event: Event) {
  const path = readPath();
  const state = readState();
  let i = state.i;
  let prev = state.prev;
  let kind: TransitionKind;
  if (i === undefined) {
    // Запись создал сам браузер (вписали адрес): нумеруем её и показываем сразу; пришли мы с того экрана, что был
    i = step + 1;
    prev = target;
    window.history.replaceState({ i, prev }, '');
    kind = 'none';
  } else {
    kind = i < step ? 'back' : i > step ? 'forward' : 'fade';
  }
  step = i;
  // Свайп «назад» в Safari уже показал свою анимацию: вторую поверх не нужно
  if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) kind = 'none';
  if (forced && forced.until > performance.now()) kind = forced.kind;
  forced = undefined;
  if (path !== target) show(path, kind, prev);
}

window.addEventListener('popstate', onHistory);
window.addEventListener('hashchange', onHistory);

export function useRoute(): Located {
  return useSyncExternalStore(subscribe, () => shown);
}

/** Открыть экран по адресу; по умолчанию он выезжает справа, как при переходе вглубь */
export function navigate(path: string, kind: TransitionKind = 'forward') {
  if (target === path) return;
  const prev = target;
  step += 1;
  window.history.pushState({ i: step, prev }, '', `#${path}`);
  show(path, kind, prev);
}

/**
 * Назад по истории; если экран открыт по прямой ссылке, ведёт на запасной путь.
 * `kind` — как показать переход: жест «назад» уже сам увёл экран за край, и второй анимации не нужно ('none').
 */
export function goBack(fallback = '/', kind?: TransitionKind) {
  if (step > 0) {
    forced = kind ? { kind, until: performance.now() + 1500 } : undefined;
    window.history.back();
  } else if (target !== fallback) {
    window.history.replaceState({ i: step }, '', `#${fallback}`);
    show(fallback, kind ?? 'back', undefined);
  }
}

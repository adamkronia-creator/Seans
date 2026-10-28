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
interface Located {
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

/** Экраны, где нижней панели нет (папка, архив, правка профиля, создание группы, страницы группы и канала, вступление по ссылке) или она своя на каждой странице (сам чат): в переходе панель
 * нельзя выделять отдельным слоем — слой, который есть только «до» или «после», рисуется прямоугольником */
const isChatRoot = (path: string) => /^\/(chat\/[^/]+(?:\/g(?:\/[^/]+)*)?|folder\/[^/]+|archive|new(?:\/[^/]+)*|join\/[^/]+|profile\/edit|profile\/photos(?:\/albums|\/album\/[^/]+)?)\/?$/.test(path);

/** Чат и его вложенные экраны (настройка теста, бланк, заключение) того же чата: на обоих внизу одна и та же панель, она остаётся на месте */
const chatSub = (path: string) => /^\/chat\/([^/]+)(?:\/(?:tests|tasks|result)\/[^/]+)?\/?$/.exec(path)?.[1];
const sameChat = (a: string, b: string) => chatSub(a) !== undefined && chatSub(a) === chatSub(b);

/** Нажатие на вкладку панели ведёт на корень с той же панелью: если и на уходящем экране она есть, остаётся на месте */
let tabbarStays: boolean | undefined;
export function keepTabbarOnNextShow() {
  tabbarStays = !!document.querySelector('.screen[data-layer="top"] .tabbar');
  // Флаг нужен уже к снимку прежнего экрана, а show() вызывается позже, внутри перехода
  document.documentElement.toggleAttribute('data-vt-chat', !tabbarStays);
}

function show(path: string, kind: TransitionKind, prev: string | undefined) {
  const chatFlag = tabbarStays !== undefined ? !tabbarStays : (isChatRoot(target) || isChatRoot(path)) && !sameChat(target, path);
  tabbarStays = undefined;
  document.documentElement.toggleAttribute('data-vt-chat', chatFlag);
  target = path;
  transition(() => {
    shown = { path, prev };
    listeners.forEach((listener) => listener());
  }, kind);
}

/** Как показать переход назад, который начали мы сами (кнопка «назад» браузера и свайп сообщают о нём только событием) */
let forced: { kind: TransitionKind; until: number } | undefined;

/** Временные записи истории: системная «назад» закрывает режим (выбор чатов, нижнее окно, просмотр фото), а не уводит с экрана.
 * Их может быть несколько, вложенных (просмотр фото, а поверх него окно): «назад» закрывает самое верхнее. Запись ставится только по
 * касанию человека: браузер пропускает записи, добавленные без него, и «назад» ушла бы с сайта */
interface Guard {
  step: number;
  onBack: () => void;
  silent: boolean;
  dead?: boolean;
}
const guards: Guard[] = [];

/** Ставит запись-«заглушку»; вернёт функцию, снимающую её, когда режим закончился другим способом */
export function guardBack(onBack: () => void): () => void {
  if (pending) {
    // Прежняя заглушка ещё уходит (history.back не отработал): новую ставим после того, как он завершится, иначе «назад» съест не ту запись
    let released = false;
    let real: (() => void) | undefined;
    queued.push(() => {
      if (!released) real = guardBack(onBack);
    });
    return () => {
      released = true;
      real?.();
    };
  }
  step += 1;
  window.history.pushState({ i: step, prev: target }, '', `#${target}`);
  const mine: Guard = { step, onBack, silent: false };
  guards.push(mine);
  return () => {
    const at = guards.indexOf(mine);
    if (at < 0) return;
    if (at !== guards.length - 1) {
      // Снимают ту, что лежит под другими: запись остаётся, пока до неё не дойдут, и тогда уйдёт молча
      mine.dead = true;
      mine.onBack = () => undefined;
      return;
    }
    guards.pop();
    let drop = 1;
    while (guards.length && guards[guards.length - 1].dead) {
      guards.pop();
      drop += 1;
    }
    mine.silent = true;
    pending = mine;
    window.history.go(-drop);
  };
}
let pending: { silent: boolean } | undefined;
const queued: Array<() => void> = [];

/** Последний переход сделал сам браузер (кнопка «назад»), а не приложение: тогда разделом экрана считается тот, где он был открыт */
let popped = false;
export const wasPopped = () => popped;

/** Браузер сам перешёл по истории (кнопка «назад»/«вперёд», свайп) или поменяли адрес руками */
function onHistory(event: Event) {
  if (pending) {
    // Заглушку сняли сами: просто возвращаем счётчик шага
    pending = undefined;
    step = readState().i ?? step - 1;
    queued.splice(0).forEach((run) => run());
    return;
  }
  const top = guards[guards.length - 1];
  if (top && event.type === 'popstate' && (readState().i ?? -1) < top.step) {
    guards.pop();
    step = readState().i ?? step - 1;
    top.onBack();
    return;
  }
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
  if (path !== target) {
    popped = true;
    show(path, kind, prev);
  }
}

window.addEventListener('popstate', onHistory);
window.addEventListener('hashchange', onHistory);

export function useRoute(): Located {
  return useSyncExternalStore(subscribe, () => shown);
}

/** Открыть экран по адресу; по умолчанию он выезжает справа, как при переходе вглубь */
export function navigate(path: string, kind: TransitionKind = 'forward') {
  if (target === path) return;
  popped = false;
  const prev = target;
  if (guards.length) {
    // Окна и режимы ещё держат свои записи истории: сперва они уходят, и только потом новый экран ложится сверху,
    // иначе «назад» сначала вернёт на пустые записи того же экрана
    const drop = guards.length;
    guards.splice(0).forEach((g) => (g.silent = true));
    pending = { silent: true };
    // Экран показывается сразу (ниже), а запись для него ложится в историю, когда записи окон уйдут: повторный navigate здесь
    // увидел бы, что экран уже показан, и записи не добавил — «назад» с нового экрана перескакивала бы через тот, откуда его открыли
    queued.push(() => {
      step += 1;
      window.history.pushState({ i: step, prev }, '', `#${path}`);
    });
    window.history.go(-drop);
  } else {
    step += 1;
    window.history.pushState({ i: step, prev }, '', `#${path}`);
  }
  show(path, kind, prev);
}

/**
 * Открыть экран поверх начала цепочки: `depth` пройденных экранов (шаги создания группы, список контактов) уходят из истории,
 * и «назад» с нового экрана ведёт на тот, с которого цепочку начали (`start`), а не по шагам мастера, как в Telegram.
 */
export function navigateOver(path: string, depth: number, kind: TransitionKind = 'forward', start = '/') {
  if (pending) {
    // Прежняя заглушка ещё уходит: начинаем, когда history.back отработает
    queued.push(() => navigateOver(path, depth, kind, start));
    return;
  }
  const drop = Math.min(guards.length + depth, step);
  popped = false;
  if (drop <= 0) {
    // Истории нет (экран открыт по прямой ссылке): запись меняется на месте
    window.history.replaceState({ i: step, prev: start }, '', `#${path}`);
    show(path, kind, start);
    return;
  }
  guards.splice(0).forEach((g) => (g.silent = true));
  pending = { silent: true };
  queued.push(() => {
    // Переход считается от экрана, где цепочка началась
    target = start;
    navigate(path, kind);
  });
  window.history.go(-drop);
}

/**
 * Вернуться на `depth` экранов разом, минуя промежуточные: выход из группы на экране «О группе» (чат уже удалён) ведёт сразу в список.
 * Записи истории позади остаются как были, браузер встаёт на нужную, и экран уезжает «назад» одной анимацией.
 */
export function goBackBy(depth: number, fallback = '/') {
  if (pending) {
    queued.push(() => goBackBy(depth, fallback));
    return;
  }
  const drop = Math.min(guards.length + depth, step);
  if (drop <= 0) {
    goBack(fallback);
    return;
  }
  guards.splice(0).forEach((g) => (g.silent = true));
  pending = { silent: true };
  queued.push(() => {
    popped = true;
    show(readPath(), 'back', readState().prev);
  });
  window.history.go(-drop);
}

/** Сменить адрес на месте, без новой записи в истории (вкладки внутри экрана: «назад» уходит с экрана, а не по вкладкам) */
export function replace(path: string, kind: TransitionKind = 'none') {
  if (target === path) return;
  popped = false;
  const prev = readState().prev;
  window.history.replaceState({ i: step, prev }, '', `#${path}`);
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

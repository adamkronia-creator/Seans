import { flushSync } from 'react-dom';

/*
 * Переходы между экранами на View Transitions API: браузер снимает экран до и после смены состояния
 * и сам проигрывает анимацию между снимками (стили — в styles/transitions.css).
 *   forward — новый экран выезжает справа поверх прежнего (открыли чат, тест, результат);
 *   back    — текущий экран уезжает вправо, под ним возвращается предыдущий;
 *   fade    — мягкая смена содержимого (вкладки нижней панели, разделы чата);
 *   none    — без анимации.
 * Где API нет (старые браузеры), новый экран просто въезжает или проявляется сам, без прежнего под ним.
 * При включённом у человека «уменьшении движения» экраны меняются сразу.
 */
export type TransitionKind = 'forward' | 'back' | 'fade' | 'none';

interface ViewTransitionLike {
  finished: Promise<unknown>;
}
type StartViewTransition = (update: () => void) => ViewTransitionLike;

const root = document.documentElement;
/** Идёт смена состояния внутри перехода: вложенные переходы не нужны, всё попадёт в тот же снимок */
let inside = false;
let serial = 0;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Кадры въезда для браузеров без View Transitions: только новый экран, старого под ним уже нет */
const ENTER: Partial<Record<TransitionKind, Keyframe[]>> = {
  forward: [{ transform: 'translateX(28px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  back: [{ transform: 'translateX(-28px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
};

/**
 * Выполнить смену состояния (setState, переход по адресу) с анимацией экрана.
 * Смена идёт одним синхронным обновлением, поэтому в снимок «после» попадает уже готовый экран.
 */
export function transition(update: () => void, kind: TransitionKind = 'fade'): void {
  if (inside || kind === 'none' || reducedMotion()) {
    update();
    return;
  }

  const start = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
  if (!start) {
    flushSync(update);
    document.querySelector('.app')?.animate(ENTER[kind] ?? [], { duration: 260, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    return;
  }

  // Направление читают стили: html[data-transition='forward'] ...; имя снимка `app` тоже появляется только на время перехода
  const id = ++serial;
  root.dataset.transition = kind;
  const run = start.call(document, () => {
    inside = true;
    try {
      flushSync(update);
    } finally {
      inside = false;
    }
  });
  // Если переход прервал следующий, метку снимает уже он
  void run.finished
    .catch(() => undefined)
    .finally(() => {
      if (id === serial) delete root.dataset.transition;
    });
}

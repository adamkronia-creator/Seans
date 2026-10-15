import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import type { Tone } from '../../utils/tone';
import './Chip.css';

/** Сколько держать палец, чтобы это было долгое нажатие: как у сообщений в чате */
const LONG_PRESS_MS = 450;
/** Сдвиг пальца, после которого это уже прокрутка ряда, а не долгое нажатие */
const SLOP = 10;
/** Столько после открытия меню по таймеру контекстное меню браузера считается эхом того же касания (приходит через доли секунды) */
const ECHO_MS = 1000;

interface ChipProps {
  children?: ReactNode;
  count?: number;
  /** Число в кружке приглушено: уведомления этого чипса выключены */
  muted?: boolean;
  active?: boolean;
  onClick?: () => void;
  /**
   * Долгое нажатие, правая кнопка мыши или клавиша меню: у чипса есть своё меню (как у папок в Telegram).
   * Получает сам чипс, чтобы меню встало рядом с ним. Нажатие, которое открыло меню, чипс не выбирает.
   */
  onLongPress?: (chip: HTMLElement) => void;
  ariaLabel?: string;
  /** Дополнительный класс (затемнение пустого раздела и т.п.) */
  className?: string;
  /** За чипсом идут страницы пейджера: цвет перетекает вслед за пальцем (см. followChips) */
  follow?: boolean;
  /**
   * Вкладка-значок: в покое только значок, а у выбранной (и у наведённой мышью) плавно раскрывается подпись из children.
   * Раскрытие идёт за страницами пейджера так же, как цвет (см. followChips)
   */
  icon?: ReactNode;
  /**
   * Чипс ряда, где невыбранные сливаются в общую капсулу, а выбранный выходит из неё отдельной плашкой (шапки «Диалогов»,
   * «Диагностики» и «Заданий»). Зазор и скругления на стыках идут за страницами пейджера (см. followChips и Chip.css)
   */
  split?: boolean;
  /** Вид содержимого: выбранный чипс заливается пастелью этого вида (см. --tone-* в tokens.css), подпись по ней тёмная. Без тона — акцентный */
  tone?: Tone;
}

export function Chip({ children, count, muted = false, active = false, onClick, onLongPress, ariaLabel, className, follow = false, icon, split = false, tone }: ChipProps) {
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  /** Долгое нажатие уже открыло меню: клик, который придёт, когда палец поднимут, не должен выбирать чипс */
  const opened = useRef(false);
  /** До какого момента контекстное меню браузера — эхо уже открытого по таймеру меню (Chrome шлёт его вслед за долгим касанием) */
  const echoUntil = useRef(0);

  // Число в кружке рядом с названием показывается, только если оно не ноль
  const hasCount = count !== undefined && count > 0;
  const cls = ['chip', active && 'chip--active', follow && 'chip--follow', icon !== undefined && 'chip--tab', split && 'chip--split', hasCount && 'chip--counted', className].filter(Boolean).join(' ');

  const stop = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    // Новое нажатие: прежняя отметка «меню открыто» устарела, даже если клика после неё не было
    opened.current = false;
    if (!onLongPress || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stop();
    const chip = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY, timer: 0 };
    start.timer = window.setTimeout(() => {
      if (press.current !== start) return;
      press.current = null;
      opened.current = true;
      echoUntil.current = Date.now() + ECHO_MS;
      onLongPress(chip);
    }, LONG_PRESS_MS);
    press.current = start;
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) stop();
  };

  const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
    if (!onLongPress) return;
    // Системное меню (долгое касание в Chrome, правая кнопка, клавиша меню) заменяем своим; если своё уже открыто по таймеру, второго не нужно.
    // Клавиша меню работает сколько угодно раз подряд: у неё нет жеста, который мог бы открыть меню раньше
    e.preventDefault();
    if (Date.now() < echoUntil.current) return;
    stop();
    // Если за этим придёт клик, это тот же жест: чипс он выбирать не должен
    opened.current = true;
    onLongPress(e.currentTarget);
  };

  const onTap = (e: MouseEvent<HTMLButtonElement>) => {
    // Клик от клавиатуры (detail 0) всегда обычный: отметка «меню открыто» могла остаться от мыши, у которой после долгого нажатия клика не было
    if (opened.current && e.detail > 0) {
      opened.current = false;
      return;
    }
    opened.current = false;
    onClick?.();
  };

  return (
    <button
      type="button"
      className={cls}
      onClick={onTap}
      onPointerDown={onLongPress ? onPointerDown : undefined}
      onPointerMove={onLongPress ? onPointerMove : undefined}
      onPointerUp={onLongPress ? stop : undefined}
      onPointerCancel={onLongPress ? stop : undefined}
      onPointerLeave={onLongPress ? stop : undefined}
      onContextMenu={onLongPress ? onContextMenu : undefined}
      aria-pressed={active}
      aria-label={ariaLabel}
      data-tone={tone}
    >
      {icon !== undefined ? (
        <>
          <span className="chip__icon" aria-hidden="true">
            {icon}
          </span>
          <span className="chip__reveal">
            <span className="chip__label">{children}</span>
          </span>
        </>
      ) : (
        children
      )}
      {hasCount && <Badge count={count} variant={muted ? (active ? 'quiet-inverse' : 'quiet') : active ? 'inverse' : 'neutral'} />}
    </button>
  );
}

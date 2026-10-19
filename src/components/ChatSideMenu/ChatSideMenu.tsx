import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import { SWIPE_DOMINANCE, SWIPE_SLOP, swipeCommits, VelocityTracker } from '../../utils/swipe';
import { IconCloseMk, IconSearchMk } from '../ChatItem/ChatIcons';
import './ChatSideMenu.css';

export interface SideMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Сколько записей в разделе; ноль и «нет» не показываются */
  count?: number;
}

interface ChatSideMenuProps {
  open: boolean;
  onClose: () => void;
  /** Фото собеседника, его имя и подпись: верх панели, как шапка чата */
  avatar: ReactNode;
  name: string;
  status: string;
  /** Вкладки чата: порядок тот же, что у страниц, которые листаются пальцем */
  items: SideMenuItem[];
  active: string;
  onSelect: (id: string) => void;
  /** Поиск по сообщениям: кнопка в шапке панели */
  onSearch?: () => void;
}

/* Закрытие свайпом вправо — по общим порогам всех жестов (utils/swipe.ts): 30% ширины экрана с учётом скорости */

/**
 * Боковая панель чата: стеклянный лист справа с вкладками (диалог, тесты, задания, заметки, сведения, история).
 * Вкладку можно выбрать здесь или листать страницы чата пальцем, как раньше. Закрывается нажатием на затемнение, крестиком,
 * жестом вправо, Esc и жестом «назад» (его подключает чат через useBackHandler). Всегда в разметке, пока закрыта — недоступна (inert).
 */
export function ChatSideMenu({ open, onClose, avatar, name, status, items, active, onSelect, onSearch }: ChatSideMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  // Обработчик может меняться при каждой перерисовке чата: эффекты ниже держат свежий, а сами не перезапускаются
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });

  // Закрытая панель не получает ни нажатий, ни фокуса, а пока она открыта, недоступно всё остальное в чате (шапка, страницы, поле ввода).
  // Layout-эффект: недоступность снимается до того, как React сфокусирует поле поиска (autoFocus) в шапке
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    el.inert = !open;
    if (!open) return;
    const behind = [...(el.parentElement?.children ?? [])].filter((c): c is HTMLElement => c instanceof HTMLElement && c !== el);
    behind.forEach((c) => (c.inert = true));
    return () => behind.forEach((c) => (c.inert = false));
  }, [open]);

  // Открытая панель забирает фокус, держит его в себе (Tab ходит по кругу: крестик, поиск, вкладки) и возвращает, когда закрыта
  useEffect(() => {
    const el = root.current;
    if (!el || !open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return latest.current();
      if (e.key !== 'Tab') return;
      const stops = [...el.querySelectorAll<HTMLElement>('button:not([disabled])')];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const now = document.activeElement;
      if (e.shiftKey && (now === first || !el.contains(now))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (now === last || !el.contains(now))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Фокус возвращается, только если он остался в панели (закрыли крестиком, затемнением или Esc). Если он уже ушёл дальше
      // (на поле поиска, которое открыла кнопка «Поиск по чату»), его не отнимаем
      const now = document.activeElement;
      if (!now || now === document.body || el.contains(now)) before?.focus({ preventScroll: true });
    };
  }, [open]);

  // Жест вправо по панели закрывает её: панель едет за пальцем, затемнение светлеет
  useEffect(() => {
    const el = panel.current;
    const host = root.current;
    if (!el || !host) return;
    let start: { id: number; x: number; y: number; t: number } | null = null;
    let dragging = false;
    let dx = 0;
    let speed = new VelocityTracker();

    const reset = () => {
      start = null;
      dragging = false;
      dx = 0;
      delete host.dataset.dragging;
      el.style.transform = '';
      host.style.removeProperty('--drag');
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      speed = new VelocityTracker();
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const mx = e.clientX - start.x;
      const my = e.clientY - start.y;
      if (!dragging) {
        if (Math.abs(my) > SWIPE_SLOP && Math.abs(my) > Math.abs(mx)) {
          start = null; // это прокрутка списка
          return;
        }
        if (mx < SWIPE_SLOP || mx < Math.abs(my) * SWIPE_DOMINANCE) return;
        dragging = true;
        host.dataset.dragging = '';
        el.setPointerCapture(e.pointerId);
      }
      dx = Math.max(0, mx);
      speed.push(e.timeStamp, e.clientX);
      el.style.transform = `translateX(${dx}px)`;
      host.style.setProperty('--drag', String(Math.max(0, 1 - dx / el.offsetWidth)));
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const shouldClose = dragging && swipeCommits(dx, speed.velocity(e.timeStamp));
      reset();
      if (shouldClose) latest.current();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', reset);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', reset);
    };
  }, []);

  return (
    // Без data-no-swipe: жест «назад» от левого края (utils/edgeBack.ts) при открытой панели закрывает её, а не уводит из чата
    <div ref={root} className={`side-menu${open ? ' is-open' : ''}`}>
      <div className="side-menu__scrim" aria-hidden="true" onClick={onClose} />
      <button ref={close} type="button" className="side-menu__close" aria-label="Закрыть меню" onClick={onClose}>
        <IconCloseMk />
      </button>
      <div ref={panel} className="side-menu__panel" role="dialog" aria-modal="true" aria-label="Разделы чата" aria-hidden={!open}>
        <div className="side-menu__head">
          {avatar}
          <div className="side-menu__who">
            <span className="side-menu__name">{name}</span>
            <span className="side-menu__status">{status}</span>
          </div>
          {onSearch && (
            <button type="button" className="side-menu__search" aria-label="Поиск по чату" onClick={onSearch}>
              <IconSearchMk />
            </button>
          )}
        </div>

        <nav className="side-menu__list" aria-label="Разделы">
          {items.map(({ id, label, icon, count }) => (
            <button
              key={id}
              type="button"
              className={`side-menu__item${id === active ? ' side-menu__item--active' : ''}`}
              aria-current={id === active ? 'page' : undefined}
              onClick={() => onSelect(id)}
            >
              {icon}
              <span className="side-menu__label">{label}</span>
              {count ? <Badge count={count} ariaLabel={`${count}`} /> : null}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

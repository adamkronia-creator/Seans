import { useEffect, useRef, type ReactNode } from 'react';
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
  /** Поиск по сообщениям: строка под вкладками */
  onSearch?: () => void;
}

/** Сколько протянуть вправо, чтобы панель закрылась, и какая скорость (px/мс) считается взмахом */
const CLOSE_DISTANCE = 72;
const CLOSE_SPEED = 0.5;

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

  // Закрытая панель не получает ни нажатий, ни фокуса; открытая забирает фокус и возвращает его, когда закрыта
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.inert = !open;
    if (!open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && latest.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Фокус возвращается, только если он остался в панели (закрыли крестиком, затемнением или Esc). Если он уже ушёл дальше
      // (на поле поиска, которое открыла строка «Поиск по чату»), его не отнимаем
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
    let speed = 0;
    let last = { x: 0, t: 0 };

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
      last = { x: e.clientX, t: e.timeStamp };
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const mx = e.clientX - start.x;
      const my = e.clientY - start.y;
      if (!dragging) {
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
          start = null; // это прокрутка списка
          return;
        }
        if (mx < 10 || mx < Math.abs(my) * 1.2) return;
        dragging = true;
        host.dataset.dragging = '';
        el.setPointerCapture(e.pointerId);
      }
      dx = Math.max(0, mx);
      const dt = e.timeStamp - last.t;
      if (dt > 0) speed = (e.clientX - last.x) / dt;
      last = { x: e.clientX, t: e.timeStamp };
      el.style.transform = `translateX(${dx}px)`;
      host.style.setProperty('--drag', String(Math.max(0, 1 - dx / el.offsetWidth)));
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const shouldClose = dragging && (dx > CLOSE_DISTANCE || speed > CLOSE_SPEED);
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
      <div ref={panel} className="side-menu__panel" role="dialog" aria-modal="true" aria-label="Разделы чата" aria-hidden={!open}>
        <div className="side-menu__head">
          {avatar}
          <div className="side-menu__who">
            <span className="side-menu__name">{name}</span>
            <span className="side-menu__status">{status}</span>
          </div>
          <button ref={close} type="button" className="side-menu__close" aria-label="Закрыть меню" onClick={onClose}>
            <IconCloseMk />
          </button>
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
              {count ? <span className="side-menu__count">{count}</span> : null}
            </button>
          ))}
        </nav>

        {onSearch && (
          <button type="button" className="side-menu__item side-menu__item--action" onClick={onSearch}>
            <IconSearchMk />
            <span className="side-menu__label">Поиск по чату</span>
          </button>
        )}
      </div>
    </div>
  );
}

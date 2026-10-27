import { useEffect, useRef, type ComponentType, type SVGProps } from 'react';
import { useExitAnimation } from '../../utils/exitAnimation';
import './FolderMenu.css';

export interface ChipMenuItem {
  key: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  run: () => void;
  danger?: boolean;
  /** Перед пунктом небольшой отступ: он отделяет группу пунктов от предыдущей */
  gap?: boolean;
}

const MENU_W = 240;
const MENU_ITEM_H = 48;
const GAP = 8;
/** Не ближе к краю колонки, чем поле страницы (--page-gutter): плашка стоит на одной вертикали с кнопками шапки и карточками */
const EDGE = 16;
/** Высота полосы между группами пунктов */
const GROUP_GAP = 8;

interface ChipMenuProps {
  /** Чипс, который удерживали: меню встаёт под ним */
  anchor: DOMRect;
  /** Сам чипс: по Escape фокус возвращается к нему (с клавиатуры иначе пришлось бы искать место заново) */
  opener?: HTMLElement;
  items: ChipMenuItem[];
  /** Название меню для чтения с экрана */
  label?: string;
  /** Ширина плашки, px (по умолчанию 240) */
  width?: number;
  onClose: () => void;
}

/**
 * Меню чипса по долгому нажатию, как у папок в Telegram: затемнение, под чипсом плашка с действиями, последнее (удаление) красное.
 * Плашка не выходит за колонку приложения, на широком экране не растягивается на всё окно. Закрывается нажатием мимо и Escape;
 * с клавиатуры: стрелки и Home/End ходят по пунктам, Tab уводит фокус дальше и закрывает меню.
 */
export function ChipMenu({ anchor, opener, items, label = 'Меню папки', width = MENU_W, onClose }: ChipMenuProps) {
  const backdrop = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  /**
   * Затемнение закрывает только то нажатие, которое началось на нём. Клик, который браузер шлёт, когда палец или мышь
   * отпускают после долгого нажатия на чипсе, начался не здесь, поэтому только что открывшееся меню он не закрывает.
   */
  const armed = useRef(false);
  useExitAnimation(backdrop, 'parent'); // копия остаётся внутри экрана: в body она теряла оформление data-pm (белая вспышка при закрытии меню)

  const column = document.querySelector('.app')?.getBoundingClientRect();
  const left = Math.max((column?.left ?? 0) + EDGE, Math.min(anchor.left, (column?.right ?? window.innerWidth) - width - EDGE));
  const height = items.length * MENU_ITEM_H + items.filter((i) => i.gap).length * GROUP_GAP + GAP;
  const below = anchor.bottom + GAP + height <= window.innerHeight - GAP;
  const top = below ? anchor.bottom + GAP : Math.max(GAP, anchor.top - GAP - height);
  // Длинное меню на низком экране прокручивается внутри себя, а не уходит за край
  const maxHeight = window.innerHeight - top - GAP;
  // Плашка вырастает из-под чипса: точка отсчёта на его середине
  const originX = Math.round(Math.min(width - 16, Math.max(16, anchor.left + anchor.width / 2 - left)));

  useEffect(() => {
    const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('button') ?? []);
    items()[0]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        opener?.focus({ preventScroll: true });
      } else if (e.key === 'Tab') {
        // Фокус уходит дальше от чипса, а не от места, где меню лежит в разметке
        opener?.focus({ preventScroll: true });
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        const list = items();
        const at = list.indexOf(document.activeElement as HTMLElement);
        let next = at;
        if (e.key === 'ArrowDown') next = (at + 1) % list.length;
        else if (e.key === 'ArrowUp') next = (at - 1 + list.length) % list.length;
        else next = e.key === 'Home' ? 0 : list.length - 1;
        list[next]?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, opener]);

  return (
    <div
      ref={backdrop}
      className="chip-menu__backdrop"
      data-no-swipe
      onPointerDown={() => {
        armed.current = true;
      }}
      onClick={() => armed.current && onClose()}
      // Системное меню поверх своего не нужно (долгое касание в Chrome шлёт его вслед за нашим), но и закрывать им наше не надо
      onContextMenu={(e) => e.preventDefault()}
    >
      <ul
        ref={menu}
        className="chip-menu"
        role="menu"
        aria-label={label}
        style={{ left, top, width, maxHeight, transformOrigin: `${originX}px ${below ? 'top' : 'bottom'}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map(({ key, label, Icon, run, danger, gap }) => (
          <li key={key} className={gap ? 'chip-menu__gap' : undefined}>
            <button
              type="button"
              role="menuitem"
              className={`chip-menu__item${danger ? ' chip-menu__item--danger' : ''}`}
              onClick={() => {
                if (key === 'edit' || key === 'create') {
                  // Переход на экран папки: меню и затемнение остаются в снимке прежнего экрана и уезжают вместе с ним.
                  // Если закрыть меню сразу, затемнение исчезает рывком до начала перехода — это и был блик
                  // Копию-«уход» после перехода не оставляем: на новом экране она мелькала бы окошком
                  backdrop.current?.setAttribute('data-no-exit', '');
                  run();
                  window.setTimeout(onClose, 500);
                  return;
                }
                // Перестановка чипсов идёт на месте: копия «ухода» меню мелькала бы поверх дрожащих чипсов
                if (key === 'order') backdrop.current?.setAttribute('data-no-exit', '');
                onClose();
                run();
              }}
            >
              <Icon />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

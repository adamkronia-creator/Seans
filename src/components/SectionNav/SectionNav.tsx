import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLayer } from '../../utils/layer';
import { scrollHooks } from '../AppScrollbar/scrollHooks';
import './SectionNav.css';

export interface NavSection {
  /** id элемента на странице, к которому ведёт пункт */
  id: string;
  title: string;
}

/** Элемент страницы по id: ищем в своём экране, чтобы экран под ним (при жесте «назад») не подменил нужный */
const byId = (scope: ParentNode, id: string) => scope.querySelector<HTMLElement>(`[id="${id}"]`);

/** Текущий раздел — последний, верх которого уже поднялся выше верхней линии окна */
function sectionAt(scope: ParentNode, root: HTMLElement, sections: NavSection[]) {
  const line = root.getBoundingClientRect().top + 24;
  let current = sections[0];
  for (const section of sections) {
    const el = byId(scope, section.id);
    if (el && el.getBoundingClientRect().top <= line) current = section;
  }
  return current;
}

/**
 * Оглавление страницы: короткое нажатие на точку общей полосы прокрутки открывает боковую панель
 * с разделами, а при перетаскивании рядом с точкой показывается название текущего раздела.
 * `scroller` — селектор прокручиваемого блока, по которому ходит оглавление.
 */
export function SectionNav({ sections, scroller }: { sections: NavSection[]; scroller: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(sections[0]?.id);
  const key = sections.map((s) => s.id).join('|');
  // Оглавление лежит в своём экране-слое и едет вместе с ним; вне слоёв — в каркасе приложения
  const { element: host } = useLayer();
  const scope: ParentNode = host ?? document;

  useEffect(() => {
    if (host === null) return; // слой ещё не нарисован
    const root = scope.querySelector<HTMLElement>(scroller);
    if (!root || sections.length === 0) return;
    scrollHooks.set(root, {
      label: () => sectionAt(scope, root, sections).title,
      tap: () => {
        setActive(sectionAt(scope, root, sections).id);
        setOpen(true);
      },
    });
    return () => {
      scrollHooks.delete(root);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroller, key, host]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (sections.length === 0 || host === null) return null;

  const go = (id: string) => {
    setOpen(false);
    byId(scope, id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toc = (
    <div className={`sec-toc${open ? ' sec-toc--open' : ''}`} aria-hidden={!open}>
      <button type="button" className="sec-toc__backdrop" aria-label="Закрыть оглавление" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <nav className="sec-toc__panel" aria-label="Оглавление">
        <ul>
          {sections.map(({ id, title }) => (
            <li key={id}>
              <button
                type="button"
                className={`sec-toc__item${id === active ? ' sec-toc__item--active' : ''}`}
                tabIndex={open ? 0 : -1}
                onClick={() => go(id)}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return createPortal(toc, host ?? document.querySelector('.app') ?? document.body);
}

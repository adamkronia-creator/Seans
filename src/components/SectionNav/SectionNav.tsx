import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { scrollHooks } from '../AppScrollbar/scrollHooks';
import './SectionNav.css';

export interface NavSection {
  /** id элемента на странице, к которому ведёт пункт */
  id: string;
  title: string;
}

/** Текущий раздел — последний, верх которого уже поднялся выше верхней линии окна */
function sectionAt(root: HTMLElement, sections: NavSection[]) {
  const line = root.getBoundingClientRect().top + 24;
  let current = sections[0];
  for (const section of sections) {
    const el = document.getElementById(section.id);
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

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(scroller);
    if (!root || sections.length === 0) return;
    scrollHooks.set(root, {
      label: () => sectionAt(root, sections).title,
      tap: () => {
        setActive(sectionAt(root, sections).id);
        setOpen(true);
      },
    });
    return () => {
      scrollHooks.delete(root);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroller, key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (sections.length === 0) return null;

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  return createPortal(toc, document.querySelector('.app') ?? document.body);
}

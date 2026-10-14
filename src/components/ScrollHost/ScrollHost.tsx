import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown } from '../ChatParts/ChatIcons';
import { reducedMotion } from '../../utils/swipe';
import './ScrollHost.css';

/** Кнопка появляется, когда до конца страницы больше этого числа пикселей (как «к последним сообщениям» в чате) */
const SHOW_FROM = 240;

/**
 * Прокручиваемый блок с кнопкой «вниз», как в переписке: если страница объемная и конец далеко, внизу справа
 * появляется круглая кнопка, она плавно отматывает к концу. `className` получает сам прокручиваемый блок.
 */
export function ScrollHost({ className, children, anchorEnd = false, resetKey }: { className: string; children: ReactNode; anchorEnd?: boolean; resetKey?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [far, setFar] = useState(false);
  /** Лента прижата к концу: как в переписке, свежее внизу, а когда содержимое растёт, конец остаётся на виду */
  const stuck = useRef(true);

  // Открыли (или сменили ленту): сразу на конец, без движения
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!anchorEnd || !el) return;
    stuck.current = true;
    el.scrollTop = el.scrollHeight;
  }, [anchorEnd, resetKey]);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setFar(el.scrollHeight - el.clientHeight - el.scrollTop > SHOW_FROM);
  }, []);

  // Конец ленты на виду, пока человек не отлистал вверх; вырос текст или пришла новая запись — конец следом
  const follow = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    if (anchorEnd && stuck.current) el.scrollTop = el.scrollHeight;
    measure();
  }, [anchorEnd, measure]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (el) stuck.current = el.scrollHeight - el.clientHeight - el.scrollTop < 24;
    measure();
  }, [measure]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    // Высота содержимого меняется (листают страницы, раскрывают текст): кнопка следует за ней
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(follow);
    observer?.observe(el);
    Array.from(el.children).forEach((child) => observer?.observe(child));
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [measure, follow, onScroll]);

  return (
    <div className="scroll-host">
      <div ref={scroller} className={className}>
        {children}
      </div>
      <button
        type="button"
        className={`scroll-host__down${far ? ' is-shown' : ''}`}
        aria-label="В конец страницы"
        aria-hidden={!far}
        tabIndex={far ? 0 : -1}
        onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' })}
      >
        <IconChevronDown />
      </button>
    </div>
  );
}

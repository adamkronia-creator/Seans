import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown } from '../ChatParts/ChatIcons';
import { reducedMotion } from '../../utils/swipe';
import './ScrollHost.css';

/** Кнопка появляется, когда до конца страницы больше этого числа пикселей (как «к последним сообщениям» в чате) */
const SHOW_FROM = 240;

/**
 * Прокручиваемый блок с кнопкой «вниз», как в переписке: если страница объемная и конец далеко, внизу справа
 * появляется круглая кнопка, она плавно отматывает к концу. `className` получает сам прокручиваемый блок.
 */
export function ScrollHost({ className, children }: { className: string; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [far, setFar] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setFar(el.scrollHeight - el.clientHeight - el.scrollTop > SHOW_FROM);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Высота содержимого меняется (листают страницы, раскрывают текст): кнопка следует за ней
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    Array.from(el.children).forEach((child) => observer?.observe(child));
    return () => {
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure]);

  return (
    <div className="scroll-host">
      <div ref={scroller} className={className}>
        {children}
      </div>
      {far && (
        <button
          type="button"
          className="scroll-host__down"
          aria-label="В конец страницы"
          onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' })}
        >
          <IconChevronDown />
        </button>
      )}
    </div>
  );
}

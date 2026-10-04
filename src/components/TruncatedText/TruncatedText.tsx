import { useLayoutEffect, useRef } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
}

/**
 * Однострочный текст с многоточием, как в Figma: пробел перед «…» не остаётся
 * (CSS text-overflow оставляет его: «самоуважения …»). Подбирает длину по ширине блока.
 */
export function TruncatedText({ text, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.textContent = text;
      if (el.scrollWidth <= el.clientWidth) return;
      let lo = 0;
      let hi = text.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        el.textContent = `${text.slice(0, mid).trimEnd()}…`;
        if (el.scrollWidth <= el.clientWidth) lo = mid;
        else hi = mid - 1;
      }
      el.textContent = `${text.slice(0, lo).trimEnd()}…`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    // Шрифт мог загрузиться позже первой отрисовки
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={ref} className={className} title={text}>
      {text}
    </span>
  );
}

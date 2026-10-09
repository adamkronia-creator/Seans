import { useLayoutEffect, useRef } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
}

/**
 * Однострочный текст с многоточием, как в Figma: пробел перед «…» не остаётся
 * (CSS text-overflow оставляет его: «самоуважения …»). Подбирает длину по ширине блока.
 *
 * Каждый замер заставляет браузер пересчитать раскладку, а надписей на экране десятки, поэтому подбор экономный:
 * для той же ширины он не повторяется, а нужную длину ищут от прикидки по доле ширины, а не делением пополам с нуля.
 */
export function TruncatedText({ text, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    /** Ширина блока, под которую надпись уже подобрана */
    let fittedWidth = -1;
    const cut = (n: number) => `${text.slice(0, n).trimEnd()}…`;
    /** Первые n знаков с многоточием помещаются в блок */
    const fitsAt = (n: number) => {
      el.textContent = cut(n);
      return el.scrollWidth <= el.clientWidth;
    };

    const fit = (force = false) => {
      const width = el.clientWidth;
      if (!force && width === fittedWidth) return;
      fittedWidth = width;
      el.textContent = text;
      const full = el.scrollWidth;
      if (full <= width) return;

      // lo — помещается, hi — нет (весь текст заведомо не помещается). Сначала прикидка по доле ширины и шаги всё шире
      // в нужную сторону, пока не найдём границу, потом деление пополам внутри неё
      let lo = 0;
      let hi = text.length;
      const guess = Math.min(hi - 1, Math.max(1, Math.floor((text.length * width) / full)));
      if (fitsAt(guess)) {
        lo = guess;
        for (let step = 1; lo + step < hi; step *= 2) {
          if (fitsAt(lo + step)) lo += step;
          else {
            hi = lo + step;
            break;
          }
        }
      } else {
        hi = guess;
        for (let step = 1; hi - step > lo; step *= 2) {
          if (fitsAt(hi - step)) {
            lo = hi - step;
            break;
          }
          hi -= step;
        }
      }
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (fitsAt(mid)) lo = mid;
        else hi = mid;
      }
      el.textContent = cut(lo);
    };

    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    // Шрифт мог загрузиться позже первой отрисовки: тогда ширина знаков другая, подбираем заново
    if (document.fonts && document.fonts.status !== 'loaded') void document.fonts.ready.then(() => fit(true));
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={ref} className={className} title={text}>
      {text}
    </span>
  );
}

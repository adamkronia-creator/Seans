import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconTestQuestion } from '../icons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import { HELP_SHOT, OPTION_HELP, type OptionHelp as Help, type OptionHelpId } from '../../data/optionHelp';
import { reducedMotion } from '../../utils/swipe';
import '../EditSheet/EditSheet.css';
import './OptionHelp.css';

/** Скриншоты подсказки подгружаются заранее, пока человек читает экран: к нажатию на «?» они уже в кеше */
const preloaded = new Set<string>();
function preload(help: Help) {
  help.slides.forEach(({ src }) => {
    if (preloaded.has(src)) return;
    preloaded.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
}

interface OptionHelpProps {
  id: OptionHelpId;
}

/** Значок «?» справа от названия настройки: по нажатию открывается окно с каруселью скриншотов и пояснениями */
export function OptionHelp({ id }: OptionHelpProps) {
  const help = OPTION_HELP[id];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 600));
    const handle = idle(() => preload(help));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle);
  }, [help]);

  const close = useCallback(() => {
    setOpen(false);
    // Фокус возвращается к значку, с которого окно открыли (для клавиатуры и экранных читалок)
    button.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="option-help"
        aria-haspopup="dialog"
        aria-label={`Что это: ${help.title}`}
        onPointerEnter={() => preload(help)}
        onClick={() => setOpen(true)}
      >
        <IconTestQuestion aria-hidden="true" />
      </button>
      {open && <HelpSheet help={help} onClose={close} />}
    </>
  );
}

/** Окно подсказки: заголовок, карусель из скриншотов, точки, подпись к показанному скриншоту и «Понятно» */
function HelpSheet({ help, onClose }: { help: Help; onClose: () => void }) {
  useSheet(onClose);
  const { slides } = help;
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLUListElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // Окно открыто: фокус внутри него, и стрелки сразу листают скриншоты
  useEffect(() => track.current?.focus({ preventScroll: true }), []);

  /** Расстояние между началами соседних слайдов: слайд плюс промежуток */
  const stepOf = (el: HTMLElement) => {
    const [first, second] = Array.from(el.children) as HTMLElement[];
    return second ? second.offsetLeft - first.offsetLeft : el.clientWidth;
  };

  // Слайды выровнены по центру с одинаковыми полями по краям, поэтому слайд i стоит по центру при scrollLeft = i × шаг
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = track.current;
      if (!el) return;
      const next = Math.round(el.scrollLeft / stepOf(el));
      setIndex(Math.min(slides.length - 1, Math.max(0, next)));
    });
  };

  const goTo = (target: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(slides.length - 1, Math.max(0, target));
    el.scrollTo({ left: next * stepOf(el), behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const way = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!way) return;
    e.preventDefault();
    goTo(index + way);
  };

  // Окно закрывает страницу под собой: Tab ходит по кругу внутри окна, а не уходит на скрытые элементы экрана
  const keepFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, [tabindex="0"]'));
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const current = slides[index];

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet option-help-sheet" role="dialog" aria-modal="true" aria-label={help.title} onKeyDown={keepFocus}>
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">{help.title}</h2>
        </div>
        <div className="sheet__body option-help-sheet__body">
          <div className="oh" role="region" aria-roledescription="карусель" aria-label={`${help.title}: скриншоты`}>
            <ul className="oh__track" ref={track} tabIndex={0} data-hscroll onScroll={onScroll} onKeyDown={onKeyDown}>
              {slides.map((slide, i) => (
                <li
                  key={slide.src}
                  className="oh__slide"
                  role="group"
                  aria-roledescription="слайд"
                  aria-label={`${i + 1} из ${slides.length}`}
                  onClick={() => i !== index && goTo(i)}
                >
                  <figure className={`oh__shot${i === index ? ' oh__shot--on' : ''}`}>
                    <img
                      className="oh__img"
                      src={slide.src}
                      alt={slide.alt}
                      width={HELP_SHOT.width}
                      height={HELP_SHOT.height}
                      draggable={false}
                      decoding="async"
                    />
                    {slide.mark && (
                      <span
                        className="oh__mark"
                        aria-hidden="true"
                        style={{ left: `${slide.mark.x}%`, top: `${slide.mark.y}%`, width: `${slide.mark.w}%`, height: `${slide.mark.h}%` }}
                      />
                    )}
                  </figure>
                </li>
              ))}
            </ul>

            <div className="oh__dots">
              {slides.map((slide, i) => (
                <button
                  key={slide.src}
                  type="button"
                  className="oh__dot"
                  aria-label={`Скриншот ${i + 1} из ${slides.length}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </div>

          {/* Подписи лежат друг на друге в одной ячейке: окно не меняет высоту, когда подпись меняется */}
          <div className="oh__captions" aria-hidden="true">
            {slides.map((slide, i) => (
              <div key={slide.src} className={`oh__caption${i === index ? ' oh__caption--on' : ''}`}>
                <h3 className="oh__title">{slide.title}</h3>
                <p className="oh__text">{slide.text}</p>
              </div>
            ))}
          </div>
          {/* Для экранных читалок подпись читается один раз, при смене скриншота */}
          <p className="visually-hidden" aria-live="polite">
            {current.title}. {current.text}
          </p>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button sheet__button--primary" onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}

import { useEffect, useRef, useState } from 'react';
import { TRANSITION_END } from '../../utils/transition';
import { scrollHooks } from './scrollHooks';
import './AppScrollbar.css';

/** Высота зоны нажатия и размеры точки — как в макете: точка 14, зона 60×40 */
const HIT_H = 40;

const isScrollable = (el: HTMLElement) => {
  const overflow = getComputedStyle(el).overflowY;
  return (overflow === 'auto' || overflow === 'scroll') && el.scrollHeight - el.clientHeight > 4 && el.clientHeight >= 120;
};

/** Прокручиваемый блок под правым краем экрана: нужно именно тот, который пользователь видит и листает */
function findScroller(app: HTMLElement): HTMLElement | null {
  const box = app.getBoundingClientRect();
  const x = box.right - 12;
  for (const k of [0.5, 0.3, 0.7, 0.2, 0.85]) {
    let el = document.elementFromPoint(x, window.innerHeight * k) as HTMLElement | null;
    while (el && el !== document.body) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
  }
  return null;
}

interface Geometry {
  left: number;
  width: number;
  top: number;
  height: number;
  frac: number;
}

/**
 * Общая полоса прокрутки приложения: тонкая линия у правого края (пройденная часть — 50% акцентного,
 * остаток — 50% от #A0A9B3) и точка 14×14, наполовину уходящая за край экрана.
 * Точку можно тянуть, зона нажатия 20×40.
 */
export function AppScrollbar() {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const press = useRef<{ y: number; moved: boolean } | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const app = () => document.querySelector<HTMLElement>('.app');

    const measure = (pick: boolean) => {
      const root = app();
      if (!root) return setGeo(null);
      // Во время перетаскивания блок не меняем
      if (pick && !press.current) target.current = findScroller(root);
      const el = target.current;
      if (!el || !el.isConnected || !isScrollable(el)) {
        target.current = null;
        return setGeo(null);
      }
      const a = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, window.innerHeight);
      const max = el.scrollHeight - el.clientHeight;
      setGeo({ left: a.left, width: a.width, top, height: bottom - top, frac: Math.min(1, Math.max(0, el.scrollTop / max)) });
    };

    const schedule = (pick: boolean) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => measure(pick));
    };

    const onScroll = (e: Event) => schedule(e.target !== target.current);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', () => schedule(true));
    // После смены экрана или раскрытия панели с анимацией выбираем блок ещё раз, когда она закончилась
    let settle = 0;
    const mutations = new MutationObserver(() => {
      schedule(true);
      window.clearTimeout(settle);
      settle = window.setTimeout(() => schedule(true), 320);
    });
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    document.addEventListener('transitionend', () => schedule(true), true);
    // Во время перехода между экранами под пальцем снимки, а не блоки: после него ищем прокручиваемый блок заново
    const onTransitionEnd = () => schedule(true);
    window.addEventListener(TRANSITION_END, onTransitionEnd);
    schedule(true);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener(TRANSITION_END, onTransitionEnd);
      document.removeEventListener('scroll', onScroll, true);
      mutations.disconnect();
      window.clearTimeout(settle);
    };
  }, []);

  if (!geo) return null;

  const travel = Math.max(geo.height - HIT_H, 1);
  const centerY = HIT_H / 2 + geo.frac * travel;

  const dragTo = (clientY: number) => {
    const el = target.current;
    if (!el) return;
    const frac = Math.min(1, Math.max(0, (clientY - geo.top - HIT_H / 2) / travel));
    el.scrollTop = frac * (el.scrollHeight - el.clientHeight);
    setLabel(scrollHooks.get(el)?.label?.() ?? null);
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved && Math.abs(e.clientY - p.y) > 4) p.moved = true;
    if (p.moved) dragTo(e.clientY);
  };
  const onUp = () => {
    const p = press.current;
    press.current = null;
    setLabel(null);
    if (p && !p.moved && target.current) scrollHooks.get(target.current)?.tap?.();
  };

  return (
    <div className="app-scrollbar" style={{ left: geo.left, width: geo.width, top: geo.top, height: geo.height }} aria-hidden="true">
      <span className="app-scrollbar__done" style={{ height: centerY }} />
      <span className="app-scrollbar__rest" style={{ top: centerY }} />
      {label && (
        <span className="app-scrollbar__label" style={{ top: centerY }}>
          {label}
        </span>
      )}
      <span
        className="app-scrollbar__hit"
        style={{ top: centerY - HIT_H / 2 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <span className="app-scrollbar__dot" />
      </span>
    </div>
  );
}

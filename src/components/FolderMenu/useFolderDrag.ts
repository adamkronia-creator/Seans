import { useEffect } from 'react';
import type { Folder, FolderScope } from '../../data/folders';

/** Соседи, уступившие место, не прыгают, а плавно переезжают: старое место считается до перестановки, переезд играет после неё */
export function flip(els: HTMLElement[], before: Map<HTMLElement, number>, axis: 'x' | 'y') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of els) {
    const from = before.get(el);
    const to = axis === 'x' ? el.offsetLeft : el.offsetTop;
    if (from === undefined || from === to) continue;
    const d = from - to;
    el.animate([{ transform: axis === 'x' ? `translateX(${d}px)` : `translateY(${d}px)` }, { transform: 'translate(0)' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', composite: 'add' });
  }
}

const HOLD_MS = 220;
const SLOP = 10;

/**
 * Перестановка чипсов папок в режиме «Изменить порядок»: чипс, который удержали, идёт за пальцем по ряду, а соседи уступают место
 * (порядок меняется в данных, чипсы переставляет React). «Все» не двигается. У края ряд сам прокручивается.
 * Работает на уровне документа: чипсы стоят в шапках разных экранов, а режим включён только на одном.
 */
export function useFolderDrag(scope: FolderScope, editing: boolean, move: (scope: FolderScope, id: string, step: -1 | 1) => void, folders: (scope: FolderScope) => readonly Folder[]) {
  useEffect(() => {
    if (!editing) return;
    let g: { id: string; chip: HTMLElement; row: HTMLElement; x0: number; y0: number; left0: number; scroll0: number; pointer: number; timer: number; drag: boolean } | null = null;

    const siblings = (row: HTMLElement) => Array.from(row.querySelectorAll<HTMLElement>(':scope > .chip[data-folder-id]'));
    const place = (x: number) => {
      if (!g) return;
      const { chip, row } = g;
      chip.style.transform = `translateX(${g.left0 + (x - g.x0) + (row.scrollLeft - g.scroll0) - chip.offsetLeft}px)`;
    };
    const rowEdge = (x: number) => {
      if (!g) return;
      const r = g.row.getBoundingClientRect();
      if (x < r.left + 40) g.row.scrollLeft -= 8;
      else if (x > r.right - 40) g.row.scrollLeft += 8;
    };

    const down = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const target = e.target instanceof Element ? e.target : null;
      const chip = target?.closest<HTMLElement>('.chip[data-folder-id]');
      if (!chip || target?.closest('.chip__x') || !chip.parentElement) return;
      const id = chip.dataset.folderId!;
      if (!folders(scope).some((f) => f.id === id)) return;
      const row = chip.parentElement;
      const start = { id, chip, row, x0: e.clientX, y0: e.clientY, left0: chip.offsetLeft, scroll0: row.scrollLeft, pointer: e.pointerId, drag: false, timer: 0 };
      start.timer = window.setTimeout(() => {
        if (g !== start) return;
        start.drag = true;
        start.left0 = chip.offsetLeft;
        start.scroll0 = row.scrollLeft;
        chip.classList.add('chip--dragging');
        chip.style.transition = 'scale 0.16s ease-out, box-shadow 0.16s';
        try {
          chip.setPointerCapture(start.pointer);
        } catch {
          // касание уже ушло
        }
        navigator.vibrate?.(10);
      }, HOLD_MS);
      g = start;
    };
    const moveEv = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.pointer) return;
      if (!g.drag) {
        if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SLOP) {
          window.clearTimeout(g.timer);
          g = null;
        }
        return;
      }
      rowEdge(e.clientX);
      place(e.clientX);
      const { chip, row, id } = g;
      const all = siblings(row);
      const at = all.indexOf(chip);
      const c = chip.offsetLeft + (parseFloat(chip.style.transform.replace(/[^-\d.]/g, '')) || 0) + chip.offsetWidth / 2;
      const next = all[at + 1];
      const prev = all[at - 1];
      const before = new Map(all.map((el) => [el, el.offsetLeft]));
      if (next && c > next.offsetLeft + next.offsetWidth / 2) move(scope, id, 1);
      else if (prev && c < prev.offsetLeft + prev.offsetWidth / 2) move(scope, id, -1);
      else return;
      // Чипсы переставлены: положение под пальцем считаем заново от нового места в ряду
      place(e.clientX);
      requestAnimationFrame(() => {
        place(e.clientX);
        flip(siblings(row).filter((el) => el !== chip), before, 'x');
      });
    };
    const end = () => {
      if (!g) return;
      const d = g;
      g = null;
      window.clearTimeout(d.timer);
      if (!d.drag) return;
      d.chip.classList.remove('chip--dragging');
      d.chip.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), scale 0.2s ease-out, box-shadow 0.2s';
      d.chip.style.transform = '';
      window.setTimeout(() => (d.chip.style.transition = ''), 260);
    };
    // Пока чипс держат, ряд не должен прокручиваться: касание отменяем, если ещё можно
    const touch = (e: TouchEvent) => {
      if (g?.drag && e.cancelable) e.preventDefault();
    };

    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', moveEv);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    document.addEventListener('touchmove', touch, { passive: false });
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', moveEv);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      document.removeEventListener('touchmove', touch);
      end();
    };
  }, [scope, editing, move, folders]);
}

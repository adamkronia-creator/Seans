import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Frame } from '../Frame/Frame';
import './CropSheet.css';

/*
 * Кадрирование аватарки при загрузке: фото лежит под круглым окном, его двигают пальцем, масштабируют щипком, колесом или ползунком.
 * Результат — квадрат 512×512 (JPEG): круг вырезает уже сама аватарка.
 */

const OUT = 512;
const MAX_ZOOM = 4;

/** Положение кадра: центр в долях ширины и высоты снимка и масштаб */
export interface CropView {
  x: number;
  y: number;
  zoom: number;
}

interface CropSheetProps {
  file: Blob;
  title?: string;
  /** Прежний кадр: окно открывается на нём, а не на середине снимка */
  initial?: CropView;
  onDone: (result: File, view: CropView) => void;
  /** «Отмена»: вернуться к выбору фото */
  onCancel: () => void;
  /** Файл не открылся как картинка */
  onError?: () => void;
}

export function CropSheet({ file, title = 'Кадрирование', initial, onDone, onCancel, onError }: CropSheetProps) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [side, setSide] = useState(300); // grid:ok — запасная сторона окна до замера
  const [zoom, setZoom] = useState(1);
  // Центр показанного квадрата в пикселях самого снимка
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSide(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = size.w ? side / Math.min(size.w, size.h) : 1; // экранных пикселей на пиксель снимка при масштабе 1
  const scale = base * zoom;
  const visible = side / scale; // сторона показанного квадрата в пикселях снимка

  const clamp = (c: { x: number; y: number }, z: number) => {
    const half = Math.min(size.w, size.h) / z / 2;
    return { x: Math.min(size.w - half, Math.max(half, c.x)), y: Math.min(size.h - half, Math.max(half, c.y)) };
  };

  const onLoad = () => {
    const img = image.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setSize({ w, h });
    // Лицо на портрете обычно в верхней трети: высокое фото открывается чуть выше середины
    const half = Math.min(w, h) / 2;
    if (initial) {
      const z = Math.min(MAX_ZOOM, Math.max(1, initial.zoom));
      const h2 = Math.min(w, h) / z / 2;
      setZoom(z);
      setCenter({ x: Math.min(w - h2, Math.max(h2, initial.x * w)), y: Math.min(h - h2, Math.max(h2, initial.y * h)) });
      return;
    }
    setCenter({ x: w / 2, y: h > w ? half + (h - w) * 0.3 : h / 2 });
  };

  const changeZoom = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    setCenter((c) => clamp(c, z));
  };

  const down = (event: ReactPointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const move = (event: ReactPointerEvent) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev || size.w === 0) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      changeZoom((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    if (pointers.current.size === 1) setCenter((c) => clamp({ x: c.x - (now.x - prev.x) / scale, y: c.y - (now.y - prev.y) / scale }, zoom));
  };

  const up = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
  };

  const done = () => {
    const img = image.current;
    if (!img || size.w === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, center.x - visible / 2, center.y - visible / 2, visible, visible, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (blob) onDone(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }), { x: center.x / size.w, y: center.y / size.h, zoom });
      },
      'image/jpeg',
      0.9,
    );
  };

  const left = side / 2 - center.x * scale;
  const top = side / 2 - center.y * scale;

  return (
    <Frame
      title={title}
      subtitle="Перетащите фото и измените масштаб"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={size.w === 0} onClick={done}>
            Готово
          </button>
        </>
      }
    >
      <div
        ref={stage}
        className="crop"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={(event) => changeZoom(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1))}
      >
        <img
          ref={image}
          className="crop__img"
          src={url}
          alt=""
          draggable={false}
          onLoad={onLoad}
          onError={onError}
          style={size.w ? { width: size.w * scale, height: size.h * scale, transform: `translate(${left}px, ${top}px)` } : { visibility: 'hidden' }}
        />
        <span className="crop__ring" aria-hidden="true" />
      </div>
      <label className="crop__zoom">
        <span className="crop__zoom-label">Масштаб</span>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} aria-label="Масштаб" onChange={(event) => changeZoom(Number(event.target.value))} />
      </label>
    </Frame>
  );
}

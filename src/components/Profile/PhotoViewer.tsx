import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ensureFull, removePhoto, setAvatar, setCover, useProfile } from '../../data/profile';
import { useExitAnimation } from '../../utils/exitAnimation';
import { reducedMotion } from '../../utils/swipe';
import { IconClose, IconTrash } from '../ChatParts/ChatIcons';
import { IconBack, IconProfile } from '../icons';
import { Toast } from '../Toast/Toast';
import { useToast } from '../Toast/useToast';
import { IconCaption, IconCover } from './ProfileIcons';
import { CaptionSheet, RemoveSheet } from './ProfileSheets';
import './PhotoViewer.css';

interface PhotoViewerProps {
  /** С какого фото начать */
  startId: string;
  /** Листать только эти фото (альбом); без списка — все фото профиля */
  ids?: string[];
  onClose: () => void;
}

/**
 * Просмотр фото на весь экран, как в соцсетях: листается пальцем вбок (у полосы прокрутки есть «примагничивание»
 * к каждому снимку, поэтому свайп работает без своей математики), стрелки на клавиатуре и кнопки по бокам — для компьютера.
 * Внизу подпись и действия: подпись, фото профиля, обложка, удалить.
 */
export function PhotoViewer({ startId, ids, onClose }: PhotoViewerProps) {
  const profile = useProfile();
  const { thumbs, fulls } = profile;
  const photos = useMemo(() => (ids ? profile.photos.filter((p) => ids.includes(p.id)) : profile.photos), [profile.photos, ids]);
  const count = photos.length;
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((p) => p.id === startId)));
  const [sheet, setSheet] = useState<'caption' | 'remove' | null>(null);
  const [toast, show] = useToast();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useExitAnimation(root);

  // Фото могли удалить: номер не выходит за список
  const at = Math.min(index, Math.max(0, count - 1));
  const photo = photos[at];
  const atRef = useRef(at);
  atRef.current = at;

  // Список опустел — просматривать нечего
  useEffect(() => {
    if (count === 0) onClose();
  }, [count, onClose]);

  // Стать на нужный снимок без анимации: при открытии, после удаления и при повороте экрана
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = atRef.current * el.clientWidth;
    setIndex(atRef.current);
  }, [count]);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollLeft = atRef.current * width;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Соседние снимки грузятся целиком заранее: листание не упирается в ожидание
  useEffect(() => {
    photos.slice(Math.max(0, at - 1), at + 2).forEach((p) => void ensureFull(p.id));
  }, [photos, at]);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === next ? prev : next));
  };

  // Потянули снимок вверх или вниз — просмотр закрывается, как в соцсетях: пока тянут, снимок идёт за пальцем, а фон светлеет.
  // Горизонтальное движение не трогаем: его ведёт полоса прокрутки. Мышью не тянем: у неё есть «Закрыть» и Escape.
  const pull = useRef<{ id: number; x: number; y: number; mode: 'idle' | 'vertical' | 'other' } | null>(null);

  const pullTo = (dy: number, animated: boolean) => {
    const el = track.current;
    const frame = root.current;
    if (!el || !frame) return;
    el.style.transition = animated ? 'transform 0.2s var(--ease-ios)' : 'none';
    frame.style.transition = animated ? 'opacity 0.2s var(--ease-ios)' : 'none';
    el.style.transform = dy === 0 ? '' : `translateY(${dy}px)`;
    frame.style.opacity = dy === 0 ? '' : String(1 - Math.min(0.6, Math.abs(dy) / 480));
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    pull.current = { id: event.pointerId, x: event.clientX, y: event.clientY, mode: 'idle' };
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const state = pull.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (state.mode === 'idle') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        state.mode = 'vertical';
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Касание уже закончилось: тянуть нечего
        }
      } else if (Math.abs(dx) > 10) {
        state.mode = 'other';
      }
    }
    if (state.mode === 'vertical') pullTo(dy, false);
  };

  const onPointerEnd = (event: ReactPointerEvent) => {
    const state = pull.current;
    if (!state || state.id !== event.pointerId) return;
    pull.current = null;
    if (state.mode !== 'vertical') return;
    const dy = event.clientY - state.y;
    if (event.type === 'pointerup' && Math.abs(dy) > 100) onClose();
    else pullTo(0, true);
  };

  const go = useCallback(
    (step: number) => {
      const el = track.current;
      if (!el) return;
      const to = Math.min(count - 1, Math.max(0, atRef.current + step));
      el.scrollTo({ left: to * el.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [count],
  );

  useEffect(() => {
    // Пока открыто окно (подпись, удаление), клавиши принадлежат ему
    if (sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet, go, onClose]);

  if (!photo) return null;
  const isAvatar = profile.avatarId === photo.id;
  const isCover = profile.coverId === photo.id;

  const toggleAvatar = () => {
    setAvatar(isAvatar ? null : photo.id);
    show(isAvatar ? 'Фото профиля убрано' : 'Фото профиля обновлено');
  };

  const toggleCover = () => {
    setCover(isCover ? null : photo.id);
    show(isCover ? 'Обложка убрана' : 'Обложка обновлена');
  };

  return createPortal(
    <div ref={root} className="viewer" role="dialog" aria-modal="true" aria-label="Просмотр фото">
      <header className="viewer__bar">
        <button type="button" className="viewer__button" aria-label="Закрыть" onClick={onClose} autoFocus>
          <IconClose />
        </button>
        <p className="viewer__count" aria-live="polite">
          {at + 1} из {count}
        </p>
      </header>

      <div
        ref={track}
        className="viewer__track"
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {photos.map((p, i) => {
          const near = Math.abs(i - at);
          const src = near <= 1 ? (fulls[p.id] ?? thumbs[p.id]) : thumbs[p.id];
          return (
            <div key={p.id} className="viewer__slide" aria-hidden={i !== at}>
              {near <= 2 && src && <img className="viewer__img" src={src} alt={p.caption} draggable={false} />}
            </div>
          );
        })}
      </div>

      {at > 0 && (
        <button type="button" className="viewer__nav viewer__nav--prev" aria-label="Предыдущее фото" onClick={() => go(-1)}>
          <IconBack />
        </button>
      )}
      {at < count - 1 && (
        <button type="button" className="viewer__nav viewer__nav--next" aria-label="Следующее фото" onClick={() => go(1)}>
          <IconBack />
        </button>
      )}

      <footer className="viewer__foot">
        {(isAvatar || isCover) && (
          <ul className="viewer__tags">
            {isAvatar && <li>Фото профиля</li>}
            {isCover && <li>Обложка</li>}
          </ul>
        )}
        {photo.caption && <p className="viewer__caption">{photo.caption}</p>}
        <div className="viewer__actions" role="group" aria-label="Действия с фото">
          <button type="button" className="viewer__action" onClick={() => setSheet('caption')}>
            <IconCaption />
            <span>Подпись</span>
          </button>
          <button type="button" className={`viewer__action${isAvatar ? ' viewer__action--on' : ''}`} aria-pressed={isAvatar} onClick={toggleAvatar}>
            <IconProfile />
            <span>Фото профиля</span>
          </button>
          <button type="button" className={`viewer__action${isCover ? ' viewer__action--on' : ''}`} aria-pressed={isCover} onClick={toggleCover}>
            <IconCover />
            <span>Обложка</span>
          </button>
          <button type="button" className="viewer__action" onClick={() => setSheet('remove')}>
            <IconTrash />
            <span>Удалить</span>
          </button>
        </div>
      </footer>

      {toast && <Toast text={toast} className="viewer__toast" />}
      {sheet === 'caption' && <CaptionSheet photoId={photo.id} onClose={() => setSheet(null)} />}
      {sheet === 'remove' && (
        <RemoveSheet
          title="Удалить фото?"
          text="Фото исчезнет из профиля. Если оно стояло на аватаре или обложке, вернутся стандартные."
          confirm="Удалить"
          onConfirm={() => {
            setSheet(null);
            removePhoto(photo.id);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>,
    document.body,
  );
}

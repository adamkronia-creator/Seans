import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { Badge } from '../Badge/Badge';
import { IconAlbum, IconImage, IconStories } from './ProfileIcons';
import './PhotoTabs.css';

export type PhotoView = 'photos' | 'albums' | 'stories';

export const PHOTO_PATHS: Record<PhotoView, string> = {
  photos: '/profile/photos',
  albums: '/profile/photos/albums',
  stories: '/profile/photos/stories',
};

export const PHOTO_VIEWS: readonly PhotoView[] = ['photos', 'albums', 'stories'];

interface PhotoTabsProps {
  value: PhotoView;
  fit?: boolean;
  onChange: (view: PhotoView) => void;
  photos: number;
  albums: number;
  stories: number;
}

/** Разделы галереи с количеством фото, альбомов и историй. */
export function PhotoTabs({ value, onChange, photos, albums, stories, fit = false }: PhotoTabsProps) {
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = row.current;
    const selected = list?.querySelector('[aria-selected="true"]');
    if (!list || !selected) return;
    const bounds = list.getBoundingClientRect();
    const button = selected.getBoundingClientRect();
    if (button.left < bounds.left) list.scrollLeft += button.left - bounds.left;
    if (button.right > bounds.right) list.scrollLeft += button.right - bounds.right;
  }, [value, photos, albums, stories]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = PHOTO_VIEWS.length;
    let next: number;
    switch (event.key) {
      case 'Home': next = 0; break;
      case 'End': next = count - 1; break;
      case 'ArrowLeft': next = (index + count - 1) % count; break;
      case 'ArrowRight': next = (index + 1) % count; break;
      default: return;
    }
    event.preventDefault();
    row.current?.querySelectorAll('button')[next]?.focus({ preventScroll: true });
    onChange(PHOTO_VIEWS[next]);
  };

  const tabs: { id: PhotoView; label: string; count: number; Icon: typeof IconImage }[] = [
    { id: 'photos', label: 'Фото', count: photos, Icon: IconImage },
    { id: 'albums', label: 'Альбомы', count: albums, Icon: IconAlbum },
    { id: 'stories', label: 'Истории', count: stories, Icon: IconStories },
  ];
  return (
    <div ref={row} className={fit ? 'ptabs ptabs--fit' : 'ptabs'} role="tablist" aria-label="Раздел фото" data-hscroll>
      {tabs.map(({ id, label, count, Icon }, index) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="ptabs__tab"
          aria-selected={value === id}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(event) => moveFocus(event, index)}
        >
          <Icon />
          <span className="ptabs__label">{label}</span>
          <Badge count={count} showZero variant={value === id ? 'inverse' : 'neutral'} />
        </button>
      ))}
    </div>
  );
}

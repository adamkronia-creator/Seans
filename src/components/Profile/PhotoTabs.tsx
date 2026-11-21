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
  onChange: (view: PhotoView) => void;
  photos: number;
  albums: number;
  stories: number;
}

interface MediaTab<T extends string> {
  id: T;
  label: string;
  count: number;
  Icon: typeof IconImage;
}

export function MediaTabs<T extends string>({ value, onChange, tabs, label }: {
  value: T;
  onChange: (value: T) => void;
  tabs: readonly MediaTab<T>[];
  label: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = row.current;
    const selected = list?.querySelector('[aria-selected="true"]');
    if (!list || !selected) return;
    const bounds = list.getBoundingClientRect();
    const button = selected.getBoundingClientRect();
    if (button.left < bounds.left) list.scrollLeft += button.left - bounds.left;
    if (button.right > bounds.right) list.scrollLeft += button.right - bounds.right;
  }, [value, tabs]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = tabs.length;
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
    onChange(tabs[next].id);
  };

  return (
    <div ref={row} className="ptabs" role="tablist" aria-label={label} data-hscroll>
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
          <Icon aria-hidden="true" />
          <span className="ptabs__label">{label}</span>
          <Badge count={count} showZero variant={value === id ? 'inverse' : 'neutral'} />
        </button>
      ))}
    </div>
  );
}

/** Разделы собственной галереи с количеством фото, альбомов и историй. */
export function PhotoTabs({ value, onChange, photos, albums, stories }: PhotoTabsProps) {
  const tabs: MediaTab<PhotoView>[] = [
    { id: 'photos', label: 'Фото', count: photos, Icon: IconImage },
    { id: 'albums', label: 'Альбомы', count: albums, Icon: IconAlbum },
    { id: 'stories', label: 'Истории', count: stories, Icon: IconStories },
  ];
  return <MediaTabs value={value} onChange={onChange} tabs={tabs} label="Раздел фото" />;
}

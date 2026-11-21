import { replace } from '../../router';
import { Badge } from '../Badge/Badge';
import { IconAlbum, IconImage, IconStories } from './ProfileIcons';
import './PhotoTabs.css';

export type PhotoView = 'photos' | 'albums' | 'stories';

export const PHOTO_PATHS: Record<PhotoView, string> = {
  photos: '/profile/photos',
  albums: '/profile/photos/albums',
  stories: '/profile/photos/stories',
};

const tabOrder: PhotoView[] = ['photos', 'albums', 'stories'];

export function switchPhotoView(from: PhotoView, to: PhotoView) {
  if (from !== to) replace(PHOTO_PATHS[to], tabOrder.indexOf(to) > tabOrder.indexOf(from) ? 'slide-next' : 'slide-prev');
}

interface PhotoTabsProps {
  value: PhotoView;
  onChange: (view: PhotoView) => void;
  photos: number;
  albums: number;
  stories: number;
}

/** Разделы галереи с количеством фото, альбомов и историй. */
export function PhotoTabs({ value, onChange, photos, albums, stories }: PhotoTabsProps) {
  const tabs: { id: PhotoView; label: string; count: number; Icon: typeof IconImage }[] = [
    { id: 'photos', label: 'Фото', count: photos, Icon: IconImage },
    { id: 'albums', label: 'Альбомы', count: albums, Icon: IconAlbum },
    { id: 'stories', label: 'Истории', count: stories, Icon: IconStories },
  ];
  return (
    <div className="ptabs" role="tablist" aria-label="Раздел фото">
      {tabs.map(({ id, label, count, Icon }) => (
        <button key={id} type="button" role="tab" className="ptabs__tab" aria-selected={value === id} onClick={() => onChange(id)}>
          <Icon />
          {label}
          <Badge count={count} showZero variant={value === id ? 'inverse' : 'neutral'} />
        </button>
      ))}
    </div>
  );
}

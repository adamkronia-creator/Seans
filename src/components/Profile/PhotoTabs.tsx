import { Badge } from '../Badge/Badge';
import { IconAlbum, IconImage } from './ProfileIcons';
import './PhotoTabs.css';

export type PhotoView = 'photos' | 'albums';

interface PhotoTabsProps {
  value: PhotoView;
  onChange: (view: PhotoView) => void;
  photos: number;
  albums: number;
}

/** Две вкладки раздела фото: «Фото» и «Альбомы». Выбранная лежит в скруглённой рамке, с кружком-счётчиком справа от названия */
export function PhotoTabs({ value, onChange, photos, albums }: PhotoTabsProps) {
  const tabs: { id: PhotoView; label: string; count: number; Icon: typeof IconImage }[] = [
    { id: 'photos', label: 'Фото', count: photos, Icon: IconImage },
    { id: 'albums', label: 'Альбомы', count: albums, Icon: IconAlbum },
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

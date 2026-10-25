import { useRef, useState, type ChangeEvent } from 'react';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { IconBack } from '../../components/icons';
import { AlbumCover } from '../../components/Profile/AlbumCover';
import { AlbumNameSheet, AlbumPhotosSheet } from '../../components/Profile/AlbumSheets';
import { PhotoTabs, type PhotoView } from '../../components/Profile/PhotoTabs';
import { PhotoViewer } from '../../components/Profile/PhotoViewer';
import { IconAlbum, IconImage, IconPencil, IconPlusLine } from '../../components/Profile/ProfileIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { filesOf, uploadPhotos } from '../../components/Profile/upload';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { removeAlbum, useProfile } from '../../data/profile';
import { goBack, navigate, replace } from '../../router';
import { useSwipeBack } from '../../utils/tabNav';
import '../FolderPage/FolderPage.css';
import './PhotosPage.css';

const PHOTOS_PATH = '/profile/photos';
const ALBUMS_PATH = '/profile/photos/albums';

interface PhotosPageProps {
  /** Вкладка («Фото» или «Альбомы») или открытый альбом */
  view: PhotoView | 'album';
  albumId?: string;
}

/**
 * «Фото и альбомы» (адреса /profile/photos, /profile/photos/albums, /profile/photos/album/<альбом>): все фото профиля сеткой,
 * вкладка «Альбомы» с карточками альбомов и сам альбом. Экран открывается кнопкой «Посмотреть» на панели фото в профиле.
 * Вкладки меняют адрес на месте, поэтому «назад» уходит в профиль, а не по вкладкам.
 */
export function PhotosPage({ view, albumId }: PhotosPageProps) {
  const profile = useProfile();
  const { photos, albums, thumbs, uploading } = profile;
  const album = view === 'album' ? albums.find((a) => a.id === albumId) : undefined;
  const [viewing, setViewing] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'new' | 'name' | 'pick' | 'delete' | null>(null);
  const [toast, show] = useToast();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  const back = () => goBack(view === 'album' ? ALBUMS_PATH : '/');
  useSwipeBack(root, back);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await uploadPhotos(filesOf(event), show);
  };
  const photoList = album ? photos.filter((p) => album.photoIds.includes(p.id)) : photos;

  const title = view === 'album' ? (album?.name ?? 'Альбом') : 'Фото и альбомы';
  const grid = (
    <ul className="ph__grid">
      {view !== 'album' &&
        Array.from({ length: uploading }, (_, i) => (
          <li key={`wait-${i}`}>
            <Skeleton className="ph__wait" width="100%" height="auto" radius="0" />
          </li>
        ))}
      {photoList.map((photo, i) => (
        <li key={photo.id}>
          {thumbs[photo.id] ? (
            <button type="button" className="ph__tile" aria-label={`Фото ${i + 1} из ${photoList.length}`} onClick={() => setViewing(photo.id)}>
              <img src={thumbs[photo.id]} alt="" loading="lazy" decoding="async" />
            </button>
          ) : (
            <Skeleton className="ph__wait" width="100%" height="auto" radius="0" />
          )}
        </li>
      ))}
    </ul>
  );

  let body;
  if (view === 'album' && !album) {
    body = <EmptyState icon={<IconAlbum />} title="Альбом не найден" text="Возможно, его уже удалили." />;
  } else if (view === 'album' && album) {
    body =
      album.photoIds.length > 0 ? (
        grid
      ) : (
        <button type="button" className="ph__empty" onClick={() => setSheet('pick')}>
          <IconImage />
          <span>Добавьте фото в альбом</span>
        </button>
      );
  } else if (view === 'albums') {
    body = (
      <ul className="ph__albums">
        <li>
          <button type="button" className="ph__album ph__album--new" onClick={() => setSheet('new')}>
            <span className="ph__album-cover">
              <IconPlusLine />
            </span>
            <span className="ph__album-name">Новый альбом</span>
          </button>
        </li>
        {albums.map((a) => (
          <li key={a.id}>
            <button type="button" className="ph__album" onClick={() => navigate(`/profile/photos/album/${a.id}`)}>
              <span className="ph__album-cover">
                <AlbumCover album={a} />
              </span>
              <span className="ph__album-name">{a.name}</span>
              <span className="ph__album-count">{a.photoIds.length}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else {
    body =
      photos.length + uploading > 0 ? (
        grid
      ) : (
        <button type="button" className="ph__empty" onClick={() => input.current?.click()}>
          <IconImage />
          <span>Добавьте первое фото</span>
        </button>
      );
  }

  return (
    <section ref={root} className="fp ph">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
          <IconBack />
        </button>
        <h1 className="fp__title">{title}</h1>
        {view === 'album' && album && (
          <button type="button" className="fp__back" aria-label="Переименовать альбом" onClick={() => setSheet('name')}>
            <IconPencil />
          </button>
        )}
        {(view !== 'album' || album) && (
          <button
            type="button"
            className="fp__back"
            aria-label={view === 'photos' ? 'Добавить фото' : view === 'albums' ? 'Новый альбом' : 'Фото в альбоме'}
            onClick={() => (view === 'photos' ? input.current?.click() : view === 'albums' ? setSheet('new') : setSheet('pick'))}
          >
            <IconPlusLine />
          </button>
        )}
      </header>

      <div className="fp__scroll ph__scroll">
        {view !== 'album' && (
          <PhotoTabs value={view} onChange={(next) => replace(next === 'albums' ? ALBUMS_PATH : PHOTOS_PATH)} photos={photos.length} albums={albums.length} />
        )}
        {body}
      </div>

      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {toast && <Toast text={toast} />}
      {sheet === 'new' && <AlbumNameSheet onClose={() => setSheet(null)} onSaved={(id) => navigate(`/profile/photos/album/${id}`)} />}
      {sheet === 'name' && album && <AlbumNameSheet albumId={album.id} onClose={() => setSheet(null)} onDelete={() => setSheet('delete')} />}
      {sheet === 'pick' && album && <AlbumPhotosSheet albumId={album.id} onClose={() => setSheet(null)} />}
      {sheet === 'delete' && album && (
        <RemoveSheet
          title="Удалить альбом?"
          text={`Альбом «${album.name}» исчезнет, а сами фото останутся в галерее.`}
          confirm="Удалить"
          onClose={() => setSheet(null)}
          onConfirm={() => {
            setSheet(null);
            removeAlbum(album.id);
            goBack(ALBUMS_PATH);
          }}
        />
      )}
      {viewing && <PhotoViewer startId={viewing} ids={album?.photoIds} onClose={() => setViewing(null)} />}
    </section>
  );
}

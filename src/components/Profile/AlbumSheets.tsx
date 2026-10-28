import { useId, useState } from 'react';
import { addAlbum, addToAlbum, renameAlbum, setAlbumPhotos, useProfile } from '../../data/profile';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { Frame } from '../Frame/Frame';
import { IconCheck } from './ProfileIcons';

interface NameProps {
  /** Есть id — переименование, нет — новый альбом */
  albumId?: string;
  onClose: () => void;
  /** Альбом создан или переименован */
  onSaved?: (id: string) => void;
  /** Только при переименовании: кнопка «Удалить альбом» */
  onDelete?: () => void;
}

/** Название альбома: новый или переименование. Без названия сохранить нельзя */
export function AlbumNameSheet({ albumId, onClose, onSaved, onDelete }: NameProps) {
  const { albums } = useProfile();
  const [name, setName] = useState(() => albums.find((a) => a.id === albumId)?.name ?? '');
  const uid = useId();
  const ready = name.trim().length > 0;
  const save = () => {
    if (!ready) return;
    const id = albumId ?? addAlbum(name);
    if (albumId) renameAlbum(albumId, name);
    onClose();
    onSaved?.(id);
  };
  return (
    <Frame
      title={albumId ? 'Название альбома' : 'Новый альбом'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={!ready} onClick={save}>
            {albumId ? 'Сохранить' : 'Создать'}
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-name`}>
          Название
        </label>
        <AutoTextarea
          id={`${uid}-name`}
          className="frame-textarea"
          rows={1}
          value={name}
          onChange={(text) => setName(text.replace(/\n/g, ' '))}
          placeholder="Например, Кабинет"
          maxLength={60}
        />
      </section>
      {onDelete && (
        <button type="button" className="sheet__card pf-remove" onClick={onDelete}>
          Удалить альбом
        </button>
      )}
    </Frame>
  );
}

/** Состав альбома: отмечаете фото из своей галереи, снятая отметка убирает фото из альбома (само фото остаётся) */
export function AlbumPhotosSheet({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const { photos, thumbs, albums } = useProfile();
  const [picked, setPicked] = useState<string[]>(() => albums.find((a) => a.id === albumId)?.photoIds ?? []);
  const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  const save = () => {
    setAlbumPhotos(albumId, picked);
    onClose();
  };
  return (
    <Frame
      title="Фото в альбоме"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={save}>
            Готово{picked.length > 0 ? ` (${picked.length})` : ''}
          </button>
        </>
      }
    >
      {photos.length > 0 ? (
        <section className="sheet__card">
          <ul className="pf-grid">
            {photos.map((photo, i) => {
              const on = picked.includes(photo.id);
              return (
                <li key={photo.id}>
                  <button type="button" className={`pf-tile${on ? ' pf-tile--on' : ''}`} aria-label={`Фото ${i + 1}`} aria-pressed={on} onClick={() => toggle(photo.id)}>
                    {thumbs[photo.id] && <img src={thumbs[photo.id]} alt="" />}
                    {on && (
                      <span className="pf-check">
                        <IconCheck />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="pf-note">В галерее пока нет фото. Добавьте их на вкладке «Фото», и их можно будет положить в альбом</p>
      )}
    </Frame>
  );
}

/** «В альбом»: выбрать, куда положить отмеченные фото. Из прежних альбомов они не убираются, а повторов в альбоме не бывает */
export function AlbumMoveSheet({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (albumName: string) => void }) {
  const { albums } = useProfile();
  const put = (albumId: string, name: string) => {
    addToAlbum(albumId, ids);
    onClose();
    onDone(name);
  };
  return (
    <Frame
      title="В альбом"
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          Отмена
        </button>
      }
    >
      {albums.length > 0 ? (
        <section className="sheet__card pf-albums">
          <ul>
            {albums.map((a) => (
              <li key={a.id}>
                <button type="button" className="pf-album" onClick={() => put(a.id, a.name)}>
                  <span className="pf-album__name">{a.name}</span>
                  <span className="pf-album__count">{a.photoIds.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="pf-note">Альбомов пока нет. Создайте первый на вкладке «Альбомы»</p>
      )}
    </Frame>
  );
}

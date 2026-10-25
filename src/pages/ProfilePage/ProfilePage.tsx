import { useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconPin } from '../../components/icons';
import { PhotoViewer } from '../../components/Profile/PhotoViewer';
import { AlbumCover } from '../../components/Profile/AlbumCover';
import { AlbumNameSheet } from '../../components/Profile/AlbumSheets';
import { PhotoTabs, type PhotoView } from '../../components/Profile/PhotoTabs';
import { IconAlbum, IconCamera, IconChevronRight, IconImage, IconPencil, IconPlusLine, IconWallpaper } from '../../components/Profile/ProfileIcons';
import { BackgroundSheet, PhotoPickSheet } from '../../components/Profile/ProfileSheets';
import { filesOf, uploadPhotos } from '../../components/Profile/upload';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { useChats } from '../../data/chatStore';
import { avatarSrcOf, coverSrcOf, useProfile } from '../../data/profile';
import { wantEdit } from '../../data/profileIntent';
import { navigate } from '../../router';
import { useTabSwipe } from '../../utils/tabNav';
import './ProfilePage.css';

/** Сколько видно на панели профиля: фото двумя рядами по три, альбомов один ряд; остальное на экране «Посмотреть» */
const PHOTOS_SHOWN = 6;
const ALBUMS_SHOWN = 3;

/**
 * Раздел «Профиль» (последняя вкладка нижней панели): обложка, аватар, имя и специализация, сводка, личная информация и фото.
 * Всё, кроме имени, необязательное: поля личной информации человек заводит и убирает сам (экран «Редактирование профиля»).
 * Нажатие на поле открывает редактирование прямо на нём, на аватар или обложку — просмотр, на значок камеры — выбор нового фото.
 */
export function ProfilePage() {
  const profile = useProfile();
  const chats = useChats();
  const [viewing, setViewing] = useState<string | null>(null);
  const [picking, setPicking] = useState<'avatar' | 'cover' | null>(null);
  const [pickingBackground, setPickingBackground] = useState(false);
  const [tab, setTab] = useState<PhotoView>('photos');
  const [newAlbum, setNewAlbum] = useState(false);
  const [toast, show] = useToast();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  // Свайп вправо ведёт в чаты (предыдущий раздел нижней панели)
  useTabSwipe(root, 'right', 'messages');

  const { photos, albums, thumbs, uploading, name, headline, city, fields } = profile;
  const cover = coverSrcOf(profile);
  const clients = chats.filter((chat) => chat.category === 'clients').length;
  const colleagues = chats.filter((chat) => chat.category === 'colleagues').length;
  const shown = photos.slice(0, PHOTOS_SHOWN);

  // Карандаш просто открывает редактирование с начала: без перехода к полю и без клавиатуры
  const edit = (_target?: string) => {
    wantEdit();
    navigate('/profile/edit');
  };

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await uploadPhotos(filesOf(event), show);
  };

  return (
    <section ref={root} className="profile">
      <div className="profile__scroll">
        <div className="profile__top">
          <div className="profile__cover">
            <button
              type="button"
              className="profile__cover-hit"
              aria-label={profile.coverId ? 'Открыть обложку' : 'Добавить обложку'}
              onClick={() => (profile.coverId ? setViewing(profile.coverId) : setPicking('cover'))}
            >
              {cover ? (
                <img className="profile__cover-img" src={cover} alt="" />
              ) : (
                <span className="profile__cover-empty">
                  <IconImage />
                  Добавить обложку
                </span>
              )}
            </button>
            <div className="profile__badges">
              {cover && (
                <button type="button" className="profile__badge profile__badge--cover" aria-label="Изменить обложку" onClick={() => setPicking('cover')}>
                  <IconCamera />
                </button>
              )}
              <button type="button" className="profile__badge profile__badge--cover" aria-label="Изменить фон приложения" onClick={() => setPickingBackground(true)}>
                <IconWallpaper />
              </button>
            </div>
          </div>

          <div className="profile__head">
            <div className="profile__row">
              <div className="profile__avatar">
                <button
                  type="button"
                  className="profile__avatar-hit"
                  aria-label={profile.avatarId ? 'Открыть фото профиля' : 'Выбрать фото профиля'}
                  onClick={() => (profile.avatarId ? setViewing(profile.avatarId) : setPicking('avatar'))}
                >
                  <Avatar src={avatarSrcOf(profile)} size={88} />
                </button>
                <button type="button" className="profile__badge profile__badge--avatar" aria-label="Изменить фото профиля" onClick={() => setPicking('avatar')}>
                  <IconCamera />
                </button>
              </div>
              <button type="button" className="profile__edit" onClick={() => edit()}>
                <IconPencil />
                Редактировать
              </button>
            </div>

            <h1 className={`profile__name${name.trim() ? '' : ' profile__name--empty'}`}>{name.trim() || 'Ваше имя'}</h1>
            {headline.trim() && <p className="profile__headline">{headline.trim()}</p>}
            {city.trim() && (
              <p className="profile__city">
                <IconPin />
                {city.trim()}
              </p>
            )}

            <ul className="profile__stats" aria-label="Сводка">
              <li className="profile__stat">
                <strong>{clients}</strong>
                <span>Клиенты</span>
              </li>
              <li className="profile__stat">
                <strong>{colleagues}</strong>
                <span>Коллеги</span>
              </li>
              <li className="profile__stat">
                <strong>{photos.length}</strong>
                <span>Фото</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="profile__photos">
        <section className="profile__card profile__card--joined" aria-labelledby="profile-info">
          <header className="profile__card-head">
            <h2 id="profile-info" className="profile__card-title">
              Личная информация
            </h2>
            <button type="button" className="profile__card-button" aria-label="Редактировать личную информацию" onClick={() => edit(fields[0]?.id ?? 'add')}>
              <IconPencil />
            </button>
          </header>
          {fields.length > 0 ? (
            <ul className="profile__fields">
              {fields.map((field) => (
                <li key={field.id}>
                  <button type="button" className="profile__field" onClick={() => edit(field.id)}>
                    <span className="profile__field-label">{field.label.trim() || 'Без названия'}</span>
                    <span className={`profile__field-value${field.value.trim() ? '' : ' profile__field-value--empty'}`}>
                      {field.value.trim() || 'Не заполнено'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile__empty">Здесь может быть всё, что вы хотите о себе рассказать: образование, подход, опыт, личный анализ.</p>
          )}
        </section>
          <div className="profile__foot">
            <button type="button" className="profile__foot-button" onClick={() => edit('add')}>
              <IconPlusLine />
              Добавить поле
            </button>
          </div>
        </div>

        <div className="profile__photos">
        <section className="profile__card profile__card--joined" aria-label="Фото и альбомы">
          <header className="profile__card-head profile__card-head--tabs">
            <PhotoTabs value={tab} onChange={setTab} photos={photos.length} albums={albums.length} />
          </header>

          {tab === 'photos' &&
            (photos.length + uploading > 0 ? (
              <ul className="profile__grid">
                {Array.from({ length: Math.min(uploading, PHOTOS_SHOWN) }, (_, i) => (
                  <li key={`wait-${i}`}>
                    <Skeleton className="profile__wait" width="100%" height="auto" radius="0" />
                  </li>
                ))}
                {shown.slice(0, Math.max(0, PHOTOS_SHOWN - uploading)).map((photo, i) => (
                  <li key={photo.id}>
                    {thumbs[photo.id] ? (
                      <button type="button" className="profile__tile" aria-label={`Фото ${i + 1} из ${photos.length}`} onClick={() => setViewing(photo.id)}>
                        <img src={thumbs[photo.id]} alt="" loading="lazy" decoding="async" />
                      </button>
                    ) : (
                      <Skeleton className="profile__wait" width="100%" height="auto" radius="0" />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <button type="button" className="profile__drop" onClick={() => input.current?.click()}>
                <IconImage />
                <span>Добавьте первое фото</span>
              </button>
            ))}

          {tab === 'albums' &&
            (albums.length > 0 ? (
              <ul className="profile__albums">
                {albums.slice(0, ALBUMS_SHOWN).map((album) => (
                  <li key={album.id}>
                    <button type="button" className="profile__album" onClick={() => navigate(`/profile/photos/album/${album.id}`)}>
                      <span className="profile__album-cover">
                        <AlbumCover album={album} />
                      </span>
                      <span className="profile__album-name">{album.name}</span>
                      <span className="profile__album-count">{album.photoIds.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button type="button" className="profile__drop" onClick={() => setNewAlbum(true)}>
                <IconAlbum />
                <span>Создайте первый альбом</span>
              </button>
            ))}

        </section>
          <div className="profile__foot">
            <button type="button" className="profile__foot-button" onClick={() => (tab === 'photos' ? input.current?.click() : setNewAlbum(true))}>
              <IconPlusLine />
              {tab === 'photos' ? 'Добавить' : 'Новый альбом'}
            </button>
            <button type="button" className="profile__foot-button" onClick={() => navigate(tab === 'photos' ? '/profile/photos' : '/profile/photos/albums')}>
              Посмотреть все
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {toast && <Toast text={toast} />}
      {pickingBackground && <BackgroundSheet onClose={() => setPickingBackground(false)} />}
      {picking && <PhotoPickSheet kind={picking} onClose={() => setPicking(null)} onNote={show} />}
      {newAlbum && <AlbumNameSheet onClose={() => setNewAlbum(false)} onSaved={(id) => navigate(`/profile/photos/album/${id}`)} />}
      {viewing && <PhotoViewer startId={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

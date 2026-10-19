import { useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconPin } from '../../components/icons';
import { PhotoViewer } from '../../components/Profile/PhotoViewer';
import { IconCamera, IconImage, IconPencil, IconPlusLine } from '../../components/Profile/ProfileIcons';
import { PhotoPickSheet } from '../../components/Profile/ProfileSheets';
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

/** Сколько фото видно в сетке, пока не нажали «Показать все»: три ряда по три */
const GRID_LIMIT = 9;

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
  const [expanded, setExpanded] = useState(false);
  const [toast, show] = useToast();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  // Свайп вправо ведёт в чаты (предыдущий раздел нижней панели)
  useTabSwipe(root, 'right', 'messages');

  const { photos, thumbs, uploading, name, headline, city, fields } = profile;
  const cover = coverSrcOf(profile);
  const clients = chats.filter((chat) => chat.category === 'clients').length;
  const colleagues = chats.filter((chat) => chat.category === 'colleagues').length;
  const shown = expanded ? photos : photos.slice(0, GRID_LIMIT);

  const edit = (target?: string) => {
    wantEdit(target);
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
            {cover && (
              <button type="button" className="profile__badge profile__badge--cover" aria-label="Изменить обложку" onClick={() => setPicking('cover')}>
                <IconCamera />
              </button>
            )}
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

        <section className="profile__card" aria-labelledby="profile-info">
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
          <button type="button" className="profile__add" onClick={() => edit('add')}>
            <IconPlusLine />
            Добавить поле
          </button>
        </section>

        <section className="profile__card" aria-labelledby="profile-photos">
          <header className="profile__card-head">
            <h2 id="profile-photos" className="profile__card-title">
              Фото
              {photos.length > 0 && <span className="profile__count">{photos.length}</span>}
            </h2>
            <button type="button" className="profile__card-link" onClick={() => input.current?.click()}>
              <IconPlusLine />
              Добавить
            </button>
          </header>

          {photos.length + uploading > 0 ? (
            <ul className="profile__grid">
              {Array.from({ length: uploading }, (_, i) => (
                <li key={`wait-${i}`}>
                  <Skeleton className="profile__wait" width="100%" height="auto" radius="var(--radius-sm)" />
                </li>
              ))}
              {shown.map((photo, i) => (
                <li key={photo.id}>
                  {thumbs[photo.id] ? (
                    <button type="button" className="profile__tile" aria-label={`Фото ${i + 1} из ${photos.length}`} onClick={() => setViewing(photo.id)}>
                      <img src={thumbs[photo.id]} alt="" loading="lazy" decoding="async" />
                    </button>
                  ) : (
                    <Skeleton className="profile__wait" width="100%" height="auto" radius="var(--radius-sm)" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" className="profile__drop" onClick={() => input.current?.click()}>
              <IconImage />
              <span>Добавьте первое фото</span>
            </button>
          )}

          {photos.length > GRID_LIMIT && (
            <button type="button" className="profile__more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Свернуть' : `Показать все (${photos.length})`}
            </button>
          )}
        </section>
      </div>

      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {toast && <Toast text={toast} />}
      {picking && <PhotoPickSheet kind={picking} onClose={() => setPicking(null)} onNote={show} />}
      {viewing && <PhotoViewer startId={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

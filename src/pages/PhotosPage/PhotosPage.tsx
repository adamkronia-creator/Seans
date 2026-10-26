import { useRef, useState, type ChangeEvent } from 'react';

import { EmptyState } from '../../components/EmptyState/EmptyState';
import { IconBack } from '../../components/icons';
import { IconCamera } from '../../components/Profile/ProfileIcons';
import { AlbumCover } from '../../components/Profile/AlbumCover';
import { AlbumMoveSheet, AlbumNameSheet, AlbumPhotosSheet } from '../../components/Profile/AlbumSheets';
import { PhotoTabs, type PhotoView } from '../../components/Profile/PhotoTabs';
import { PhotoViewer } from '../../components/Profile/PhotoViewer';
import { IconAlbum, IconCheck, IconDots, IconDownload, IconFolderMove, IconForward, IconImage, IconPencil, IconPin, IconPlusLine, IconSelect, IconShare } from '../../components/Profile/ProfileIcons';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconTrash } from '../../components/ChatParts/ChatIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { filesOf, uploadPhotos } from '../../components/Profile/upload';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { sendMessage } from '../../data/chatStore';
import { ForwardSheet } from '../../components/ForwardSheet/ForwardSheet';
import { removeAlbum, removeManyPhotos, setPinned, useProfile } from '../../data/profile';
import { downloadPhotos, messageImage, sharePhotos } from '../../utils/photoActions';
import { useLongPress } from '../../utils/useLongPress';
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

interface TileProps {
  src: string;
  label: string;
  selecting: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onMenu: (el: HTMLElement) => void;
  pinned: boolean;
}

/** Плитка фото: нажатие открывает просмотр (при выборе — отмечает), долгое нажатие открывает список действий */
function PhotoTile({ src, label, selecting, selected, onOpen, onToggle, onMenu, pinned }: TileProps) {
  const { handlers, swallow } = useLongPress(selecting ? undefined : onMenu);
  return (
    <button
      type="button"
      className={`ph__tile${selected ? ' ph__tile--on' : ''}`}
      aria-label={label}
      aria-pressed={selecting ? selected : undefined}
      {...handlers}
      onClick={(e) => {
        if (swallow(e)) return;
        if (selecting) onToggle();
        else onOpen();
      }}
    >
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
      {pinned && !selecting && (
        <span className="ph__pin" aria-hidden="true">
          <IconPin />
        </span>
      )}
      {selecting && (
        <span className={`ph__check${selected ? ' ph__check--on' : ''}`} aria-hidden="true">
          {selected && <IconCheck />}
        </span>
      )}
    </button>
  );
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
  const [sheet, setSheet] = useState<'new' | 'name' | 'pick' | 'delete' | 'move' | 'remove' | 'forward' | null>(null);
  /** Выбранные фото; null — обычный режим */
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [menu, setMenu] = useState<{ rect: DOMRect; opener: HTMLElement; id: string | null } | null>(null);
  /** Над какими фото сейчас работает окно «В альбом» или «Удалить» */
  const [target, setTarget] = useState<string[]>([]);
  const [toast, show] = useToast();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  const back = () => (chosen ? leave() : goBack(view === 'album' ? ALBUMS_PATH : '/'));
  useSwipeBack(root, back);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await uploadPhotos(filesOf(event), show);
  };
  const selecting = chosen !== null;
  const toggle = (id: string) => setChosen((now) => (now ? (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]) : [id]));
  const leave = () => setChosen(null);

  const photoList = album ? photos.filter((p) => album.photoIds.includes(p.id)) : photos;

  const note = (text: string) => show(text);
  const doDownload = async (ids: string[]) => {
    const n = await downloadPhotos(ids, profile.fulls, profile.thumbs);
    note(n > 0 ? (n === 1 ? 'Фото скачано' : `Скачано фото: ${n}`) : 'Не удалось скачать');
  };
  const doShare = async (ids: string[]) => {
    if (!(await sharePhotos(ids, profile.fulls, profile.thumbs))) note('Поделиться здесь нельзя: скачайте фото');
  };
  const albumOf = (id: string) => albums.find((a) => a.photoIds.includes(id));

  /** Список действий: над одним фото (долгое нажатие) или над отмеченными */
  const menuItems = (id: string | null): ChipMenuItem[] => {
    const ids = id ? [id] : (chosen ?? []);
    if (ids.length === 0) return [];
    const one = id ? photos.find((p) => p.id === id) : undefined;
    const pinned = id ? !!one?.pinned : ids.every((x) => photos.find((p) => p.id === x)?.pinned);
    const inAlbum = id ? albumOf(id) : undefined;
    const items: ChipMenuItem[] = [
      { key: 'download', label: 'Скачать', Icon: IconDownload, run: () => void doDownload(ids) },
      { key: 'forward', label: 'Переслать в чат', Icon: IconForward, run: () => { setTarget(ids); setSheet('forward'); } },
      { key: 'share', label: 'Поделиться', Icon: IconShare, run: () => void doShare(ids) },
    ];
    if (inAlbum && view !== 'album') items.push({ key: 'goto', label: 'Перейти к альбому', Icon: IconAlbum, run: () => navigate(`/profile/photos/album/${inAlbum.id}`) });
    items.push(
      { key: 'move', label: 'Переместить в альбом', Icon: IconFolderMove, run: () => { setTarget(ids); setSheet('move'); } },
      { key: 'pin', label: pinned ? 'Открепить' : 'Закрепить', Icon: IconPin, run: () => { setPinned(ids, !pinned); note(pinned ? 'Откреплено' : 'Закреплено'); leave(); } },
    );
    if (id && !selecting) items.push({ key: 'select', label: 'Выбрать несколько', Icon: IconSelect, run: () => setChosen([id]) });
    if (id === null && chosen && chosen.length < photoList.length) items.push({ key: 'all', label: 'Выбрать все', Icon: IconSelect, run: () => setChosen(photoList.map((p) => p.id)) });
    items.push({ key: 'delete', label: 'Удалить', Icon: IconTrash, danger: true, gap: true, run: () => { setTarget(ids); setSheet('remove'); } });
    return items;
  };

  const title = view === 'album' ? (album?.name ?? 'Альбом') : 'Фото и альбомы';
  const grid = (
    <ul className="ph__grid">
      {view !== 'album' &&
        Array.from({ length: uploading }, (_, i) => (
          <li key={`wait-${i}`}>
            <Skeleton className="ph__wait" width="100%" height="auto" radius="0" />
          </li>
        ))}
      {view === 'photos' && !selecting && (
        <li>
          <button type="button" className="ph__tile ph__tile--add" onClick={() => input.current?.click()}>
            <IconCamera />
            <span>Загрузить</span>
          </button>
        </li>
      )}
      {photoList.map((photo, i) => (
        <li key={photo.id}>
          {thumbs[photo.id] ? (
            <PhotoTile
              src={thumbs[photo.id]}
              label={`Фото ${i + 1} из ${photoList.length}`}
              selecting={selecting}
              selected={chosen?.includes(photo.id) ?? false}
              pinned={photo.pinned}
              onOpen={() => setViewing(photo.id)}
              onToggle={() => toggle(photo.id)}
              onMenu={(el) => setMenu({ rect: el.getBoundingClientRect(), opener: el, id: photo.id })}
            />
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
        {selecting ? (
          <button type="button" className="ph__cancel" onClick={leave}>
            Отмена
          </button>
        ) : (
          <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
            <IconBack />
          </button>
        )}
        <h1 className="fp__title">{selecting ? (chosen.length > 0 ? `Выбрано: ${chosen.length}` : 'Выберите фото') : title}</h1>
        {selecting ? (
          <button
            type="button"
            className="fp__back"
            aria-label="Действия с выбранными"
            disabled={chosen.length === 0}
            onClick={(e) => setMenu({ rect: e.currentTarget.getBoundingClientRect(), opener: e.currentTarget, id: null })}
          >
            <IconDots />
          </button>
        ) : (
          <>
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
          </>
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
      {menu && <ChipMenu anchor={menu.rect} opener={menu.opener} items={menuItems(menu.id)} label="Действия с фото" width={256} onClose={() => setMenu(null)} />}
      {sheet === 'move' && (
        <AlbumMoveSheet
          ids={target}
          onClose={() => setSheet(null)}
          onDone={(name) => {
            note(`Перемещено в «${name}»`);
            leave();
          }}
        />
      )}
      {sheet === 'forward' && (
        <ForwardSheet
          onClose={() => setSheet(null)}
          onSend={(chatIds) => {
            const ids = target;
            setSheet(null);
            void (async () => {
              let sent = 0;
              for (const id of ids) {
                const image = await messageImage(id, profile.fulls, profile.thumbs);
                if (!image) continue;
                const caption = photos.find((p) => p.id === id)?.caption ?? '';
                chatIds.forEach((chatId) => sendMessage(chatId, caption, undefined, { image }));
                sent += 1;
              }
              note(sent ? (sent === 1 ? 'Фото отправлено' : `Отправлено фото: ${sent}`) : 'Не удалось переслать');
              leave();
            })();
          }}
        />
      )}
      {sheet === 'remove' && (
        <RemoveSheet
          title={target.length > 1 ? `Удалить фото (${target.length})?` : 'Удалить фото?'}
          text="Фото исчезнет из профиля. Если оно стояло на аватаре или обложке, вернутся стандартные."
          confirm="Удалить"
          onClose={() => setSheet(null)}
          onConfirm={() => {
            setSheet(null);
            removeManyPhotos(target);
            leave();
          }}
        />
      )}
      {viewing && <PhotoViewer startId={viewing} ids={album?.photoIds} onClose={() => setViewing(null)} />}
    </section>
  );
}

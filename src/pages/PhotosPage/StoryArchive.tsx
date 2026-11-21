import { createPortal } from 'react-dom';
import { useRef, useState } from 'react';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { Frame } from '../../components/Frame/Frame';
import { IconBack } from '../../components/icons';
import { CollectionNameSheet } from '../../components/Profile/AlbumSheets';
import { CollectionCaption } from '../../components/Profile/CollectionCaption';
import { PHOTO_PATHS } from '../../components/Profile/PhotoTabs';
import { IconAlbum, IconPencil, IconPlusLine, IconStories } from '../../components/Profile/ProfileIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { StoryTile, useOwnStoryMedia } from '../../components/Profile/StoryMedia';
import { removeStoryFolder, saveStoryFolder, setFolderStories, STORY_BACKGROUNDS, useOwnStories, useStoryFolders, type Story, type StoryFolder } from '../../data/stories';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/tabNav';
import './PhotosPage.css';

const folderPath = (id: string) => `${PHOTO_PATHS.stories}/folder/${id}`;

function StoryFolderContents({ folder, stories, onClose }: { folder: StoryFolder; stories: Story[]; onClose: () => void }) {
  const [picked, setPicked] = useState(folder.storyIds);
  return (
    <Frame
      title="Истории в папке"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>Отмена</button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={() => {
            setFolderStories(folder.id, picked);
            onClose();
          }}>
            Готово{picked.length > 0 && ` (${picked.length})`}
          </button>
        </>
      }
    >
      {stories.length > 0 ? (
        <section className="sheet__card">
          <ul className="pf-grid">
            {stories.map((story) => (
              <li key={story.id}>
                <StoryTile
                  story={story}
                  selected={picked.includes(story.id)}
                  onClick={() => setPicked((ids) => ids.includes(story.id) ? ids.filter((id) => id !== story.id) : [...ids, story.id])}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : <p className="pf-note">Опубликуйте историю, чтобы добавить её в папку.</p>}
    </Frame>
  );
}

export function StoryArchive({ folderId, gallery }: { folderId?: string; gallery?: { chromeHost: HTMLElement | null } }) {
  const stories = useOwnStories().slice().reverse();
  const folders = useStoryFolders();
  const folder = folders.find(({ id }) => id === folderId);
  const shown = folder ? stories.filter(({ id }) => folder.storyIds.includes(id)) : stories;
  const media = useOwnStoryMedia(shown);
  const [sheet, setSheet] = useState<'new' | 'name' | 'pick' | 'delete' | null>(null);
  const root = useRef<HTMLElement>(null);
  const back = () => goBack(folderId ? PHOTO_PATHS.stories : '/');
  useSwipeBack(root, back);
  const close = () => setSheet(null);

  const header = (
    <header className="fp__header">
      <button type="button" className="fp__back" aria-label="Назад" onClick={back}><IconBack /></button>
      <h1 className="fp__title">{folder?.name ?? (folderId ? 'Папка историй' : 'Фото и альбомы')}</h1>
      {folder && <button type="button" className="fp__back" aria-label="Настроить папку историй" onClick={() => setSheet('name')}><IconPencil /></button>}
    </header>
  );

  const fab = (!folderId || folder) && (
    <button
      type="button"
      className="ph__fab"
      aria-label={folder ? 'Истории в папке' : 'Добавить историю'}
      onClick={folder ? () => setSheet('pick') : media.compose}
    >
      <IconPlusLine />
    </button>
  );

  return (
    <section ref={gallery ? undefined : root} className="fp ph">
      {gallery ? gallery.chromeHost && createPortal(<>{header}{fab}</>, gallery.chromeHost) : header}
      <div className={gallery ? 'ph-gallery__content' : 'fp__scroll ph__scroll'}>
        {!folderId && (
          <ul className="ph__albums" aria-label="Папки историй">
            <li>
              <button type="button" className="ph__tile ph__tile--add ph__collection-add" onClick={() => setSheet('new')}>
                <IconPlusLine />
                <span>Новая папка</span>
              </button>
            </li>
            {folders.map((item) => {
              const cover = stories.find(({ id }) => item.storyIds.includes(id));
              return (
                <li key={item.id}>
                  <button type="button" className="ph__album" onClick={() => navigate(folderPath(item.id))}>
                    <span className="ph__album-cover" style={cover ? { background: STORY_BACKGROUNDS[cover.bg], color: 'var(--palette-white)' } : undefined}>
                      <IconAlbum />
                    </span>
                    <CollectionCaption name={item.name} count={item.storyIds.length} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {folderId && !folder ? <EmptyState icon={<IconAlbum />} title="Папка не найдена" /> : (
          shown.length > 0 ? (
            <ul className="ph__grid" aria-label={folder ? 'Истории в папке' : 'Все истории'}>
              {shown.map((story) => (
                <li key={story.id}><StoryTile story={story} onClick={(event) => media.open(story.id, event)} /></li>
              ))}
            </ul>
          ) : (
            <button type="button" className="ph__empty" onClick={folder ? () => setSheet('pick') : media.compose}>
              <IconStories /><span>{folder ? 'Добавьте истории в папку' : 'Добавьте первую историю'}</span>
            </button>
          )
        )}
      </div>
      {!gallery && fab}
      {(sheet === 'new' || (sheet === 'name' && folder)) && (
        <CollectionNameSheet
          title={folder ? 'Название папки' : 'Новая папка'}
          initial={folder?.name}
          editing={Boolean(folder)}
          onClose={close}
          onSave={(name) => {
            const id = saveStoryFolder(name, folder?.id);
            close();
            if (!folder && id) navigate(folderPath(id));
          }}
          onDelete={folder ? () => setSheet('delete') : undefined}
          deleteLabel="Удалить папку"
        />
      )}
      {sheet === 'pick' && folder && <StoryFolderContents folder={folder} stories={stories} onClose={close} />}
      {sheet === 'delete' && folder && (
        <RemoveSheet
          title="Удалить папку?"
          text={`Истории из «${folder.name}» останутся в галерее.`}
          confirm="Удалить"
          onClose={close}
          onConfirm={() => {
            removeStoryFolder(folder.id);
            close();
            back();
          }}
        />
      )}
      {media.overlay}
    </section>
  );
}

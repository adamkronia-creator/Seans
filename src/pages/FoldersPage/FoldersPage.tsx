import { useRef, useState } from 'react';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { folderPath } from '../../components/FolderMenu/useFolderMenu';
import { removeFolderText, FOLDER_NOUNS } from '../../components/FolderMenu/folderTexts';
import { IconTrash } from '../../components/ChatParts/ChatIcons';
import { IconBack } from '../../components/icons';
import { IconPencil, IconPlusLine } from '../../components/Profile/ProfileIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { useChats } from '../../data/chatStore';
import { addFolderWith, createFolder, deleteFolder, moveFolder, useFolders, type Folder, type FolderScope } from '../../data/folders';
import { plural } from '../../data/taskValues';
import { goBack, navigate } from '../../router';
import { flip } from '../../components/FolderMenu/useFolderDrag';
import { useSwipeBack } from '../../utils/swipeBack';
import '../FolderPage/FolderPage.css';
import './FoldersPage.css';

export const foldersPath = '/folders';

const TEXTS: Record<FolderScope, { title: string; all: string; lead: string }> = {
  chats: { title: 'Папки с чатами', all: 'Все чаты', lead: 'Вы можете создать папки с нужными чатами и переключаться между ними.' },
  tests: { title: 'Папки с тестами', all: 'Все тесты', lead: 'Вы можете создать папки с нужными тестами и переключаться между ними.' },
  tasks: { title: 'Папки с заданиями', all: 'Все задания', lead: 'Вы можете создать папки с нужными заданиями и переключаться между ними.' },
};

const ROW = 56;

/** Рекомендованные папки чатов, как в Telegram: название, пояснение и состав на момент добавления */
const RECOMMENDED: { name: string; note: string; pick: (c: { unread: number; pinned?: boolean }) => boolean }[] = [
  { name: 'Новые', note: 'Чаты с новыми сообщениями', pick: (c) => c.unread > 0 },
  { name: 'Закреплённые', note: 'Чаты, которые вы закрепили', pick: (c) => c.pinned === true },
];

/**
 * «Папки с чатами» (как в Telegram, открывается из меню чипса «Все»): все папки списком. Строку можно перетащить за значок слева,
 * у каждой папки меню «Настроить» и «Удалить», внизу «Создать новую папку». «Все» всегда первая и не двигается.
 */
export function FoldersPage({ scope }: { scope: FolderScope }) {
  const folders = useFolders(scope);
  const chats = useChats();
  const text = TEXTS[scope];
  // Рекомендуются только те, которых в ряду ещё нет (по названию)
  const taken = new Set(folders.map((f) => f.name.trim().toLowerCase()));
  const recommended = scope === 'chats' ? RECOMMENDED.filter((r) => !taken.has(r.name.toLowerCase())) : [];
  const [menu, setMenu] = useState<{ folder: Folder; rect: DOMRect; opener: HTMLElement } | null>(null);
  const [asking, setAsking] = useState<Folder | null>(null);
  const list = useRef<HTMLUListElement>(null);
  useSwipeBack('.fs', asking === null, () => goBack('/'));

  // Перетаскивание за значок: строка идёт за пальцем, при пересечении середины соседа порядок меняется (как у чипсов)
  const grab = (e: React.PointerEvent<HTMLElement>, id: string) => {
    const handle = e.currentTarget;
    const row = handle.closest('li') as HTMLElement | null;
    if (!row) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const top0 = row.offsetTop;
    row.classList.add('fs-row--dragging');
    row.style.transition = 'box-shadow 0.16s';
    const place = (y: number) => {
      row.style.transform = `translateY(${top0 + (y - y0) - row.offsetTop}px)`;
    };
    const moveEv = (ev: PointerEvent) => {
      place(ev.clientY);
      const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('li[data-id]') ?? []);
      const at = rows.indexOf(row);
      const c = row.offsetTop + (parseFloat(row.style.transform.replace(/[^-\d.]/g, '')) || 0) + ROW / 2;
      const n = rows[at + 1];
      const p = rows[at - 1];
      const before = new Map(rows.map((el) => [el, el.offsetTop]));
      if (n && c > n.offsetTop + ROW / 2) moveFolder(scope, id, 1);
      else if (p && c < p.offsetTop + ROW / 2) moveFolder(scope, id, -1);
      else return;
      place(ev.clientY);
      requestAnimationFrame(() => {
        place(ev.clientY);
        flip(Array.from(list.current?.querySelectorAll<HTMLElement>('li[data-id]') ?? []).filter((el) => el !== row), before, 'y');
      });
    };
    const done = () => {
      handle.removeEventListener('pointermove', moveEv);
      handle.removeEventListener('pointerup', done);
      handle.removeEventListener('pointercancel', done);
      row.classList.remove('fs-row--dragging');
      row.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s';
      row.style.transform = '';
      window.setTimeout(() => (row.style.transition = ''), 240);
    };
    handle.addEventListener('pointermove', moveEv);
    handle.addEventListener('pointerup', done);
    handle.addEventListener('pointercancel', done);
  };

  const items: ChipMenuItem[] = menu
    ? [
        { key: 'edit', label: 'Настроить папку', Icon: IconPencil, run: () => navigate(folderPath(menu.folder.id)) },
        { key: 'delete', label: 'Удалить папку', Icon: IconTrash, danger: true, run: () => setAsking(menu.folder) },
      ]
    : [];

  return (
    <section className="fp fs">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">{text.title}</h1>
          <p className="fp__subtitle">Настройка папок</p>
        </div>
      </header>
      <div className="fp__scroll">
        <div className="fs__lead">
          <svg className="fs__art" viewBox="0 0 96 80" aria-hidden="true">
            <rect x="16" y="14" width="64" height="12" rx="4" fill="#E08A3C" />
            <rect x="26" y="8" width="18" height="10" rx="3" fill="#3B5BDB" />
            <rect x="52" y="8" width="18" height="10" rx="3" fill="#E03131" />
            <path d="M10 28a4 4 0 0 1 4-4h22l6 6h40a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#F0C48F" stroke="#C99A5E" strokeWidth="2" />
          </svg>
          <p>{text.lead}</p>
        </div>

        {recommended.length > 0 && (
          <section className="fp__card" aria-label="Рекомендованные папки">
            <h2 className="fp__heading fp__heading--pad">Рекомендованные папки</h2>
            <ul className="fs__rec">
              {recommended.map((r) => (
                <li key={r.name} className="fs-rec">
                  <span className="fs-rec__text">
                    <span className="fs-rec__name">{r.name}</span>
                    <span className="fs-rec__note">{r.note}</span>
                  </span>
                  <button
                    type="button"
                    className="fs-rec__add"
                    aria-label={`Добавить папку «${r.name}»`}
                    onClick={() =>
                      addFolderWith(
                        scope,
                        r.name,
                        chats.filter((c) => !c.favorites && !c.archived && r.pick(c)).map((c) => c.id),
                      )
                    }
                  >
                    Добавить
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="fp__card" aria-label={text.title}>
          <h2 className="fp__heading fp__heading--pad">{text.title}</h2>
          <ul ref={list} className="fs__list">
            <li className="fs-row">
              <span className="fs-row__grip fs-row__grip--off" aria-hidden="true">
                <Grip />
              </span>
              <span className="fs-row__name">{text.all}</span>
            </li>
            {folders.map((folder) => (
              <li key={folder.id} className="fs-row" data-id={folder.id}>
                <span className="fs-row__grip" role="button" aria-label={`Переставить папку «${folder.name}»`} onPointerDown={(e) => grab(e, folder.id)}>
                  <Grip />
                </span>
                <button type="button" className="fs-row__body" onClick={() => navigate(folderPath(folder.id))}>
                  <span className="fs-row__name">{folder.name}</span>
                  <span className="fs-row__count">
                    {folder.ids.length} {plural(folder.ids.length, FOLDER_NOUNS[scope])}
                  </span>
                </button>
                <button
                  type="button"
                  className="fs-row__more"
                  aria-label={`Меню папки «${folder.name}»`}
                  onClick={(e) => setMenu({ folder, rect: e.currentTarget.getBoundingClientRect(), opener: e.currentTarget })}
                >
                  <span />
                  <span />
                  <span />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="fs-row fs-row--create" onClick={() => navigate(folderPath(createFolder(scope)))}>
                <span className="fs-row__plus" aria-hidden="true">
                  <IconPlusLine />
                </span>
                Создать новую папку
              </button>
            </li>
          </ul>
        </section>
      </div>
      {menu && <ChipMenu anchor={menu.rect} opener={menu.opener} items={items} onClose={() => setMenu(null)} />}
      {asking && (
        <RemoveSheet
          title="Удалить папку?"
          text={removeFolderText(scope, asking.name)}
          confirm="Удалить"
          onConfirm={() => {
            deleteFolder(scope, asking.id);
            setAsking(null);
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </section>
  );
}

const Grip = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 9h14M5 15h14" />
  </svg>
);


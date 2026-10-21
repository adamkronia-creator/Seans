import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { onRemoveFolderAsk, startFolderEdit, stopFolderEdit, useFolderEditing } from '../../data/folderEdit';
import { moveFolder, getFolders } from '../../data/folders';
import { createFolder, deleteFolder, toggleFolderMuted, useFolders, type Folder, type FolderScope } from '../../data/folders';
import { navigate } from '../../router';
import { IconTrash } from '../ChatParts/ChatIcons';
import { IconPencil } from '../Profile/ProfileIcons';
import { RemoveSheet } from '../Profile/ProfileSheets';
import { Toast } from '../Toast/Toast';
import { useToast } from '../Toast/useToast';
import { ChipMenu, type ChipMenuItem } from './ChipMenu';
import { IconBellOff, IconBellOn, IconFolderCog, IconFolderPlus, IconReorder } from './FolderIcons';
import { useFolderDrag } from './useFolderDrag';
import { removeFolderText } from './folderTexts';

/** Адрес экрана настроек папки: раздел определяется вкладкой, на которой он открыт */
export const folderPath = (id: string) => `/folder/${id}`;

type Sheet = { kind: 'remove'; folder: Folder };

/**
 * Всё, что происходит по долгому нажатию на чипс раздела: меню, окно порядка, вопрос перед удалением и подсказки.
 * Страница вешает `open` на `onLongPress` чипсов и кладёт `node` внутрь себя (подсказка встаёт у низа страницы).
 *
 * Меню папки: изменить порядок, настроить папку, уведомления (только у чатов), удалить. Меню у «Все»: создать папку и порядок —
 * так создаётся новая папка, отдельной кнопки «+» в ряду чипсов нет.
 */
export function useFolderMenu(scope: FolderScope): { open: (id: string, chip: HTMLElement) => void; node: ReactNode } {
  const folders = useFolders(scope);
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect; chip: HTMLElement } | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, say] = useToast();

  const open = useCallback((id: string, chip: HTMLElement) => setMenu({ id, rect: chip.getBoundingClientRect(), chip }), []);
  const close = useCallback(() => setMenu(null), []);
  const editing = useFolderEditing(scope);
  useFolderDrag(scope, editing, moveFolder, getFolders);
  // Значок удаления на чипсе и Escape
  useEffect(() => {
    const off = onRemoveFolderAsk((s, id) => {
      const target = getFolders(s).find((f) => f.id === id);
      if (s === scope && target) setSheet({ kind: 'remove', folder: target });
    });
    return off;
  }, [scope]);
  useEffect(() => {
    if (!editing) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && stopFolderEdit();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [editing]);

  const folder = menu ? folders.find((f) => f.id === menu.id) : undefined;
  const reorder: ChipMenuItem[] =
    folders.length > 1 ? [{ key: 'order', label: 'Изменить порядок', Icon: IconReorder, run: () => startFolderEdit(scope) }] : [];

  let items: ChipMenuItem[] = [];
  if (menu?.id === 'all') {
    items = [{ key: 'edit', label: 'Настроить папки', Icon: IconFolderCog, run: () => navigate('/folders') }, { key: 'create', label: 'Создать папку', Icon: IconFolderPlus, run: () => navigate(folderPath(createFolder(scope))) }, ...reorder];
  } else if (folder) {
    items = [
      ...reorder,
      { key: 'edit', label: 'Настроить папку', Icon: IconPencil, run: () => navigate(folderPath(folder.id)) },
      ...(scope === 'chats'
        ? [
            {
              key: 'mute',
              label: folder.muted ? 'Вкл. уведомления' : 'Откл. уведомления',
              Icon: folder.muted ? IconBellOn : IconBellOff,
              run: () => say(toggleFolderMuted(scope, folder.id) ? `Уведомления папки «${folder.name}» выключены` : `Уведомления папки «${folder.name}» включены`),
            },
          ]
        : []),
      { key: 'delete', label: 'Удалить папку', Icon: IconTrash, danger: true, run: () => setSheet({ kind: 'remove', folder }) },
    ];
  }

  const node = (
    <>
      {menu && items.length > 0 && <ChipMenu anchor={menu.rect} opener={menu.chip} items={items} onClose={close} />}
      {editing && (
        <button type="button" className="folder-edit__done" onClick={stopFolderEdit}>
          Готово
        </button>
      )}
      {sheet?.kind === 'remove' && (
        <RemoveSheet
          title="Удалить папку?"
          text={removeFolderText(scope, sheet.folder.name)}
          confirm="Удалить"
          onConfirm={() => {
            deleteFolder(scope, sheet.folder.id);
            say(`Папка «${sheet.folder.name}» удалена`);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {toast && <Toast text={toast} />}
    </>
  );

  return { open, node };
}

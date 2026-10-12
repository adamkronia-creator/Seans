import { useCallback, useState, type ReactNode } from 'react';
import { createFolder, deleteFolder, toggleFolderMuted, useFolders, type Folder, type FolderScope } from '../../data/folders';
import { navigate } from '../../router';
import { IconTrash } from '../ChatParts/ChatIcons';
import { IconPencil } from '../Profile/ProfileIcons';
import { RemoveSheet } from '../Profile/ProfileSheets';
import { Toast } from '../Toast/Toast';
import { useToast } from '../Toast/useToast';
import { ChipMenu, type ChipMenuItem } from './ChipMenu';
import { IconBellOff, IconBellOn, IconFolderPlus, IconReorder } from './FolderIcons';
import { FolderOrderSheet } from './FolderOrderSheet';
import { removeFolderText } from './folderTexts';

/** Адрес экрана настроек папки: раздел определяется вкладкой, на которой он открыт */
export const folderPath = (id: string) => `/folder/${id}`;

type Sheet = { kind: 'order' } | { kind: 'remove'; folder: Folder };

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

  const folder = menu ? folders.find((f) => f.id === menu.id) : undefined;
  const reorder: ChipMenuItem[] =
    folders.length > 1 ? [{ key: 'order', label: 'Изменить порядок', Icon: IconReorder, run: () => setSheet({ kind: 'order' }) }] : [];

  let items: ChipMenuItem[] = [];
  if (menu?.id === 'all') {
    items = [{ key: 'create', label: 'Создать папку', Icon: IconFolderPlus, run: () => navigate(folderPath(createFolder(scope))) }, ...reorder];
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
      {sheet?.kind === 'order' && <FolderOrderSheet scope={scope} onClose={() => setSheet(null)} />}
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

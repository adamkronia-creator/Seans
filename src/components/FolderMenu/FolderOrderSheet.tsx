import { moveFolder, useFolders, type FolderScope } from '../../data/folders';
import { plural } from '../../data/taskValues';
import { Frame } from '../ChatBooking/BookingSheets';
import { IconChevronDown, IconChevronUp } from '../ChatParts/ChatIcons';
import { FOLDER_NOUNS } from './folderTexts';
import './FolderMenu.css';

/**
 * Окно «Порядок папок»: каждую папку можно поднять или опустить, ряд чипсов за окном меняется сразу.
 * «Все» всегда первая и в список не входит.
 */
export function FolderOrderSheet({ scope, onClose }: { scope: FolderScope; onClose: () => void }) {
  const folders = useFolders(scope);
  return (
    <Frame
      title="Порядок папок"
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button sheet__button--primary" onClick={onClose}>
          Готово
        </button>
      }
    >
      <section className="sheet__card" aria-label="Папки">
        <ul className="fo-list">
          {folders.map((folder, i) => (
            <li key={folder.id} className="fo-row">
              <span className="fo-row__text">
                <span className="fo-row__name">{folder.name}</span>
                <span className="fo-row__count">
                  {folder.ids.length} {plural(folder.ids.length, FOLDER_NOUNS[scope])}
                </span>
              </span>
              <button
                type="button"
                className="fo-row__tool"
                aria-label={`Поднять папку «${folder.name}» выше`}
                disabled={i === 0}
                onClick={() => moveFolder(scope, folder.id, -1)}
              >
                <IconChevronUp />
              </button>
              <button
                type="button"
                className="fo-row__tool"
                aria-label={`Опустить папку «${folder.name}» ниже`}
                disabled={i === folders.length - 1}
                onClick={() => moveFolder(scope, folder.id, 1)}
              >
                <IconChevronDown />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="fo-hint">Папка «Все» всегда стоит первой.</p>
    </Frame>
  );
}

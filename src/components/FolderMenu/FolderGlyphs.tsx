import type { ReactNode } from 'react';
import type { FolderIconId } from '../../data/folders';

/*
 * Значки папок: контурные, 24×24, цвет берут у текста (currentColor), размер — от font-size. Это те значки, из которых
 * выбирают в настройках папки (FolderPage), и те, что стоят на чипсах. Системные чипсы («Все», «Недавнее») берут свои отсюда же,
 * но выбрать их нельзя.
 */

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const DRAW: Record<FolderIconId | 'all' | 'recent', ReactNode> = {
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17.5 14.2c2.3.2 3.8 1.9 3.8 4.3" />
    </>
  ),
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3 13h18" />
    </>
  ),
  book: (
    <>
      <path d="M6.5 4H19v16H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4z" />
      <path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  flag: <path d="M6 21V4M6 4.5h11l-2 4 2 4H6" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />,
  cross: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  star: <path d="m12 3.5 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  flame: <path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 1-3.5 2.2-4.5.2 1.6 1 2.4 2 2.6C10.8 9 11 6 12 3z" />,
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  checklist: <path d="M10 7h9M10 12h9M10 17h9M4.5 7l1.2 1.2L8 6M4.5 12l1.2 1.2L8 11M4.5 17l1.2 1.2L8 16" />,
  all: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
    </>
  ),
  recent: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

/** Значок по номеру: папки, а также «Все» и «Недавнее» */
export function FolderGlyph({ id }: { id: FolderIconId | 'all' | 'recent' }) {
  return <Svg>{DRAW[id]}</Svg>;
}

/** Подписи значков для читалок экрана и подсказок в окне выбора */
export const FOLDER_ICON_LABELS: Record<FolderIconId, string> = {
  folder: 'Папка',
  user: 'Человек',
  users: 'Люди',
  chat: 'Чат',
  briefcase: 'Портфель',
  book: 'Книга',
  bolt: 'Молния',
  flag: 'Флаг',
  heart: 'Сердце',
  cross: 'Крест',
  star: 'Звезда',
  flame: 'Пламя',
  bookmark: 'Закладка',
  checklist: 'Список',
};

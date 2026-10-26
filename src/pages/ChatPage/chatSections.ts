import type { ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconTabInfo, IconTabLibrary, IconTabMessages, IconTabNotes, IconTabPractices, IconTabTests } from '../../components/icons';
import type { SectionId } from '../../data/chatTabs';

/** Названия вкладок чата */
export const SECTION_LABEL: Record<SectionId, string> = {
  messages: 'Диалог',
  tests: 'Опросники',
  tasks: 'Задания',
  notes: 'Заметки',
  info: 'Сведения',
  library: 'История',
};

/** Значки вкладок (компоненты: и меню, и экран настройки берут их отсюда) */
export const SECTION_ICON: Record<SectionId, ChipMenuItem['Icon']> = {
  messages: IconTabMessages,
  tests: IconTabTests,
  tasks: IconTabPractices,
  notes: IconTabNotes,
  info: IconTabInfo,
  library: IconTabLibrary,
};

/** Смысловые группы для отступов в меню: диалог и заметки, опросники и задания, сведения и история */
export const SECTION_GROUP: Record<SectionId, number> = { messages: 0, notes: 0, tests: 1, tasks: 1, info: 2, library: 2 };

/*
 * Какой раздел открыть в чате, когда в него перешли из другого места (например, из «Ежедневника»).
 * Раздел чата живет внутри самого чата, а не в адресе, поэтому пожелание передается через эту «записку»:
 * её оставляют перед переходом, чат читает её при открытии и стирает.
 */

/** Разделы карточки собеседника */
export type ChatSection = 'booking' | 'messages' | 'tests' | 'tasks' | 'notes' | 'library';

let wanted: { chatId: string; section: ChatSection } | undefined;

/** Оставить записку: когда откроется этот чат, показать этот раздел */
export function wantSection(chatId: string, section: ChatSection) {
  wanted = { chatId, section };
}

/** Прочитать записку для чата, не стирая её (чтение может повторяться при перерисовке) */
export function wantedSection(chatId: string): ChatSection | undefined {
  return wanted?.chatId === chatId ? wanted.section : undefined;
}

export function clearWanted() {
  wanted = undefined;
}

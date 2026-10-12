import type { FolderScope } from '../../data/folders';

/** Что лежит в папках раздела: «3 чата», «1 тест», «0 заданий» */
export const FOLDER_NOUNS: Record<FolderScope, [string, string, string]> = {
  chats: ['чат', 'чата', 'чатов'],
  tests: ['тест', 'теста', 'тестов'],
  tasks: ['задание', 'задания', 'заданий'],
};

/** Что остаётся в «Все» после удаления папки */
const KEPT: Record<FolderScope, string> = { chats: 'чаты', tests: 'тесты', tasks: 'задания' };

/** Вопрос перед удалением папки: чего не будет и что останется */
export const removeFolderText = (scope: FolderScope, name: string) => `Папка «${name}» исчезнет, а ${KEPT[scope]} останутся в списке «Все».`;

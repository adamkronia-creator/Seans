import { respondInvite } from '../../data/roleStore';

/** Ответить на приглашение; если чат от этого лёг в папку роли, экран получает короткую подсказку («Добавлен в папку «Клиенты»») */
export function answerInvite(inviteId: string, accept: boolean, onNote?: (text: string) => void) {
  const result = respondInvite(inviteId, accept);
  if (result?.folder) onNote?.(`Добавлен в папку «${result.folder}»`);
}

/*
 * Адреса результатов, которые прошёл клиент.
 * Лежат отдельно от clientResults.ts: сообщения чата (messages.ts) берут ссылки отсюда и не могут импортировать
 * сами результаты, иначе цепочка clientResults → selfTest → chatStore → messages замкнётся в круг.
 */

/** Номер результата клиента: «<чат>-<тест>», например «maxim-phq9» (результаты самого психолога — «r1», «r2»…) */
export const clientResultId = (chatId: string, testId: string): string => `${chatId}-${testId}`;

/** Адрес экрана результата (hash-маршрут без «#») */
export const clientResultPath = (chatId: string, testId: string): string =>
  `/chat/${chatId}/result/${clientResultId(chatId, testId)}`;

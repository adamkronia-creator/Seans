/*
 * К чему перейти на экране редактирования профиля, когда на него пришли со страницы профиля: к полю, которое нажали,
 * или к блоку «Добавить поле». Экран редактирования читает записку при открытии, а стирает при закрытии.
 */

/** id поля или 'add' — блок «Добавить поле» */
export type EditTarget = string;

let wanted: EditTarget | undefined;

/** Оставить записку и открыть редактирование (адрес открывает вызывающий экран) */
export function wantEdit(target?: EditTarget) {
  wanted = target;
}

/** Прочитать записку, не стирая её (чтение может повторяться при перерисовке) */
export const wantedEdit = (): EditTarget | undefined => wanted;

export function clearWantedEdit() {
  wanted = undefined;
}

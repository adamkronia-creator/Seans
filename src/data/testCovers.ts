import bdiCover from '../assets/covers/bdi.webp';
import smolCover from '../assets/covers/smol.webp';

/**
 * Картинка-подложка карточки завершённого теста во вкладке «Опросники» в чате. Пока она есть у двух тестов, остальные стоят обычной строкой.
 *   src ......... картинка (1000 px по ширине, webp), лежит в assets/covers;
 *   tone ........ светлая она или тёмная: от этого зависит, насколько её нужно прикрыть, чтобы читался текст
 *                 (белый текст на светлой картинке и тёмный на тёмной не читаются);
 *   position .... какая часть картинки видна в узкой карточке (object-position).
 */
export interface TestCover {
  src: string;
  tone: 'dark' | 'light';
  position: string;
}

export const TEST_COVERS: Record<string, TestCover> = {
  // Шкала депрессии Бека: дождь за окном, синие сумерки
  bdi: { src: bdiCover, tone: 'dark', position: '50% 72%' },
  // СМОЛ: тёплый кабинет, книги и растение
  smol: { src: smolCover, tone: 'light', position: '50% 68%' },
};

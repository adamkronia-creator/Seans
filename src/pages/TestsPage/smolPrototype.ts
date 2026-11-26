import { LIBRARY, type LibraryTest } from '../../data/library';

export const SMOL = LIBRARY.find((test) => test.id === 'smol')!;

export const SMOL_PROTOTYPE: LibraryTest = {
  ...SMOL,
  id: 'smol-prototype',
  title: 'СМОЛ — прототип',
  abbr: 'Прототип',
  description: 'Новый экран настройки тестирования',
  catalogDescription: 'Новый экран настройки тестирования',
  categories: [],
  prototype: true,
};

export const TESTS_WITH_PROTOTYPE = LIBRARY.flatMap((test) =>
  test === SMOL ? [test, SMOL_PROTOTYPE] : [test],
);

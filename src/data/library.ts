import { useSyncExternalStore } from 'react';
import smolIcon from '../assets/tests/smol.webp';
import bhsIcon from '../assets/tests/bhs.webp';
import sqIcon from '../assets/tests/sq.webp';
import ittIcon from '../assets/tests/itt.webp';
import bdiIcon from '../assets/tests/bdi.webp';
import itoIcon from '../assets/tests/ito.webp';
import ocrIcon from '../assets/tests/ocr.webp';
import phq9Icon from '../assets/tests/phq9.webp';
import gad7Icon from '../assets/tests/gad7.webp';
import rsesIcon from '../assets/tests/rses.webp';
import pfqIcon from '../assets/tests/5pfq.webp';
import scl90Icon from '../assets/tests/scl90.webp';
import evidenceIcon from '../assets/tasks/evidence.webp';
import pieIcon from '../assets/tasks/pie.webp';
import smerIcon from '../assets/tasks/smer.webp';
import activationIcon from '../assets/tasks/activation.webp';
import worryIcon from '../assets/tasks/worry.webp';
import shouldIcon from '../assets/tasks/should.webp';
import choiceIcon from '../assets/tasks/choice.webp';
import phraseIcon from '../assets/tasks/phrase.webp';
import secretIcon from '../assets/tasks/secret.webp';

export type TestCategory = 'training' | 'svo';
export type TaskCategory = 'practice' | 'hospital';

// Начальные папки чипсов «Диагностики» (после «Все», «Избранное» и «Недавнее»); из них собираются папки, см. data/folders.ts
export const TEST_CATEGORIES: { id: TestCategory; label: string }[] = [
  { id: 'training', label: 'Тренинг' },
  { id: 'svo', label: 'СВО' },
];

export interface LibraryItem<C extends string = string> {
  /** Совпадает с id в журнале клиента (clientStore), если тест уже присылали */
  id: string;
  title: string;
  /** Короткое название теста (СМОЛ, BDI): в карточках его нет, но по нему ищут */
  abbr?: string;
  description: string;
  icon: string;
  /** Фон аватарки: цвет палитры get-color.ru/pastel, без прозрачности */
  tint: string;
  /** Какой категории принадлежит тест. В макете не показано, распределение условное */
  categories: C[];
}

export type LibraryTest = LibraryItem<TestCategory>;

// Библиотека всех тестов приложения; порядок как в макете
export const LIBRARY: LibraryTest[] = [
  { id: 'smol', title: 'Сокращённый многофакторный опросник личности', abbr: 'СМОЛ', description: 'Для комплексной оценки личности', icon: smolIcon, tint: '#A8E4A0', categories: ['training', 'svo'] },
  { id: 'bhs', title: 'Шкала безнадежности А. Бека', abbr: 'BHS', description: 'Для оценки ожиданий', icon: bhsIcon, tint: '#FFDB8B', categories: ['svo'] },
  { id: 'sq', title: 'Опросник Леонгарда-Шмишека', abbr: 'SQ', description: 'Для выявления особенностей личности', icon: sqIcon, tint: '#FAD6A5', categories: ['training'] },
  { id: 'itt', title: 'Интегративный тест тревожности', abbr: 'ИТТ', description: 'Для оценки тревожности', icon: ittIcon, tint: '#FCDD76', categories: ['training', 'svo'] },
  { id: 'bdi', title: 'Шкала депрессии А. Бека', abbr: 'BDI', description: 'Для оценки депрессии', icon: bdiIcon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'ito', title: 'Индивидуально-типологический опросник Л.Н. Собчик', abbr: 'ИТО', description: 'Для типологической оценки личности', icon: itoIcon, tint: '#EDD19C', categories: ['training'] },
  { id: 'ocr', title: 'Опросник суицидального риска', abbr: 'ОСР', description: 'Для выявления суицидального риска', icon: ocrIcon, tint: '#E6E6FA', categories: ['svo'] },
  { id: 'phq9', title: 'Опросник депрессивного состояния', abbr: 'PHQ-9', description: 'Для оценки депрессии', icon: phq9Icon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'gad7', title: 'Опросник генерализованного тревожного расстройства', abbr: 'GAD-7', description: 'Для оценки тревожности', icon: gad7Icon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'rses', title: 'Шкала самоуважения М. Розенберга', abbr: 'RSES', description: 'Для исследования самооценки', icon: rsesIcon, tint: '#AFEEEE', categories: ['training'] },
  { id: '5pfq', title: 'Пятифакторный опросник личности', abbr: '5PFQ', description: 'Для оценки факторов личности', icon: pfqIcon, tint: '#FFC1CC', categories: ['training'] },
  { id: 'scl90', title: 'Симптоматический опросник', abbr: 'SCL-90', description: 'Для оценки клинической симптоматики', icon: scl90Icon, tint: '#FF9BAA', categories: ['svo'] },
];

// ——— Избранное: сердечко на карточке включает и выключает элемент ———

/** Отдельное избранное для библиотеки (тестов, заданий): хранилище с подпиской для React */
function createFavorites(initial: string[]) {
  let favorites: ReadonlySet<string> = new Set(initial);
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return {
    use: (): ReadonlySet<string> => useSyncExternalStore(subscribe, () => favorites),
    toggle: (id: string) => {
      const next = new Set(favorites);
      if (!next.delete(id)) next.add(id);
      favorites = next;
      listeners.forEach((l) => l());
    },
  };
}

const testFavorites = createFavorites(['smol', 'itt', 'bdi', 'ito', '5pfq', 'scl90']);
export const useFavorites = testFavorites.use;
export const toggleFavorite = testFavorites.toggle;

// ——— Психологические задания ———

// Начальные папки чипсов «Заданий» (после «Все», «Избранное» и «Недавнее»)
export const TASK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'practice', label: 'Практика' },
  { id: 'hospital', label: 'Больница' },
];

export type LibraryTask = LibraryItem<TaskCategory>;

// Библиотека заданий; порядок как в макете, распределение по категориям условное
export const TASK_LIBRARY: LibraryTask[] = [
  { id: 'evidence', title: 'Поиск доказательств', description: 'Для мыслей автоматического характера', icon: evidenceIcon, tint: '#FFBCAD', categories: ['practice'] },
  { id: 'pie', title: 'Пирог ответственности', description: 'Для снижения вины и ответственности', icon: pieIcon, tint: '#9FE2BF', categories: ['practice'] },
  { id: 'smer', title: 'Дневник СМЭР', description: 'Для анализа событий, мыслей, эмоций', icon: smerIcon, tint: '#FFB28B', categories: ['practice', 'hospital'] },
  { id: 'activation', title: 'Поведенческая активация', description: 'Для апатии при депрессии и выгорании', icon: activationIcon, tint: '#FFBCAD', categories: ['hospital'] },
  { id: 'worry', title: 'Отложенное беспокойство', description: 'Для снижения тревожности', icon: worryIcon, tint: '#C6DF90', categories: ['hospital'] },
  { id: 'should', title: 'Что я должен?', description: 'Для исследования долженствований', icon: shouldIcon, tint: '#FCE883', categories: ['practice'] },
  { id: 'choice', title: 'Выбор без правильного ответа', description: 'Для дистанционирования от мнений', icon: choiceIcon, tint: '#E6E6FA', categories: ['practice'] },
  { id: 'phrase', title: 'Фраза, которую я запомнил', description: 'Для анализа материалов из детства', icon: phraseIcon, tint: '#FFE4C4', categories: ['practice'] },
  { id: 'secret', title: 'Если никто не узнает', description: 'Для выявления желания', icon: secretIcon, tint: '#E6EDF8', categories: ['practice'] },
];

const taskFavorites = createFavorites(['pie', 'activation', 'worry', 'should', 'secret']);
export const useTaskFavorites = taskFavorites.use;
export const toggleTaskFavorite = taskFavorites.toggle;

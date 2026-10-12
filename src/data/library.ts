import { useSyncExternalStore } from 'react';
import {
  IconLibActivation,
  IconLibBdi,
  IconLibBhs,
  IconLibChoice,
  IconLibEvidence,
  IconLibGad7,
  IconLibIto,
  IconLibItt,
  IconLibOcr,
  IconLibPfq,
  IconLibPhq9,
  IconLibPhrase,
  IconLibPie,
  IconLibRses,
  IconLibScl90,
  IconLibSecret,
  IconLibShould,
  IconLibSmer,
  IconLibSmol,
  IconLibSq,
  IconLibWorry,
  type IconComponent,
} from '../components/icons';

export type TestCategory = 'practice' | 'hospital' | 'project';
export type TaskCategory = 'svo' | 'training';

// Названия категорий из чипсов макета; последний чипс в макете обрезан («Пр…»), остальные неизвестны
export const TEST_CATEGORIES: { id: TestCategory; label: string }[] = [
  { id: 'practice', label: 'Практика' },
  { id: 'hospital', label: 'Больница' },
  { id: 'project', label: 'Проект' },
];

export interface LibraryItem<C extends string = string> {
  /** Совпадает с id в журнале клиента (clientStore), если тест уже присылали */
  id: string;
  title: string;
  /** Короткое название теста (СМОЛ, BDI): в карточках его нет, но по нему ищут */
  abbr?: string;
  description: string;
  /** Значок методики: рисуется на плитке цвета `tint` */
  icon: IconComponent;
  /** Фон аватарки, накладывается с прозрачностью 75% */
  tint: string;
  /** Какой категории принадлежит тест. В макете не показано, распределение условное */
  categories: C[];
}

export type LibraryTest = LibraryItem<TestCategory>;

// Библиотека всех тестов приложения; порядок как в макете
export const LIBRARY: LibraryTest[] = [
  { id: 'smol', title: 'Сокращенный многофакторный опросник личности', abbr: 'СМОЛ', description: 'Для комплексной оценки личности', icon: IconLibSmol, tint: '#B3E59F', categories: ['practice', 'hospital'] },
  { id: 'bhs', title: 'Шкала безнадежности А. Бека', abbr: 'BHS', description: 'Для оценки ожиданий', icon: IconLibBhs, tint: '#FFD18D', categories: ['hospital'] },
  { id: 'sq', title: 'Опросник Леонгарда-Шмишека', abbr: 'SQ', description: 'Для выявления особенностей личности', icon: IconLibSq, tint: '#FED2A4', categories: ['practice'] },
  { id: 'itt', title: 'Интегративный тест тревожности', abbr: 'ИТТ', description: 'Для оценки тревожности', icon: IconLibItt, tint: '#FFE177', categories: ['practice', 'project'] },
  { id: 'bdi', title: 'Шкала депрессии А. Бека', abbr: 'BDI', description: 'Для оценки депрессии', icon: IconLibBdi, tint: '#FFCEBF', categories: ['hospital'] },
  { id: 'ito', title: 'Индивидуально-типологический опросник Л.Н. Собчик', abbr: 'ИТО', description: 'Для типологической оценки личности', icon: IconLibIto, tint: '#F2D1A5', categories: ['practice'] },
  { id: 'ocr', title: 'Опросник суицидального риска', abbr: 'ОСР', description: 'Для выявления суицидального риска', icon: IconLibOcr, tint: '#E8EDF2', categories: ['hospital'] },
  { id: 'phq9', title: 'Опросник депрессивного состояния', abbr: 'PHQ-9', description: 'Для оценки депрессии', icon: IconLibPhq9, tint: '#FFCEBF', categories: ['hospital', 'practice'] },
  { id: 'gad7', title: 'Опросник генерализованного тревожного расстройства', abbr: 'GAD-7', description: 'Для оценки тревожности', icon: IconLibGad7, tint: '#FFCEBF', categories: ['practice', 'hospital'] },
  { id: 'rses', title: 'Шкала самоуважения М. Розенберга', abbr: 'RSES', description: 'Для исследования самооценки', icon: IconLibRses, tint: 'rgb(153 230 252 / 75%)', categories: ['project'] },
  { id: '5pfq', title: 'Пятифакторный опросник личности', abbr: '5PFQ', description: 'Для оценки факторов личности', icon: IconLibPfq, tint: 'rgb(254 153 160 / 75%)', categories: ['project', 'practice'] },
  { id: 'scl90', title: 'Симптоматический опросник', abbr: 'SCL-90', description: 'Для оценки клинической симптоматики', icon: IconLibScl90, tint: 'rgb(255 95 122 / 75%)', categories: ['hospital'] },
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

export const TASK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'svo', label: 'СВО' },
  { id: 'training', label: 'Тренинг' },
];

export type LibraryTask = LibraryItem<TaskCategory>;

// Библиотека заданий; порядок как в макете, распределение по категориям условное
export const TASK_LIBRARY: LibraryTask[] = [
  { id: 'evidence', title: 'Поиск доказательств', description: 'Для мыслей автоматического характера', icon: IconLibEvidence, tint: '#FFCEBF', categories: ['svo'] },
  { id: 'pie', title: 'Пирог ответственности', description: 'Для снижения вины и ответственности', icon: IconLibPie, tint: '#6FD7A3', categories: ['svo'] },
  { id: 'smer', title: 'Дневник СМЭР', description: 'Для анализа событий, мыслей, эмоций', icon: IconLibSmer, tint: '#E19974', categories: ['svo', 'training'] },
  { id: 'activation', title: 'Поведенческая активация', description: 'Для апатии при депрессии и выгорании', icon: IconLibActivation, tint: '#FFCEBF', categories: ['svo'] },
  { id: 'worry', title: 'Отложенное беспокойство', description: 'Для снижения тревожности', icon: IconLibWorry, tint: '#B9EA6A', categories: ['svo'] },
  { id: 'should', title: 'Что я должен?', description: 'Для исследования долженствований', icon: IconLibShould, tint: 'rgb(255 225 119 / 75%)', categories: ['training'] },
  { id: 'choice', title: 'Выбор без правильного ответа', description: 'Для дистанционирования от мнений', icon: IconLibChoice, tint: '#EAF6FF', categories: ['training'] },
  { id: 'phrase', title: 'Фраза, которую я запомнил', description: 'Для анализа материалов из детства', icon: IconLibPhrase, tint: '#FFDECF', categories: ['training'] },
  { id: 'secret', title: 'Если никто не узнает', description: 'Для выявления желания', icon: IconLibSecret, tint: '#F2EBDA', categories: ['training'] },
];

const taskFavorites = createFavorites(['pie', 'activation', 'worry', 'should', 'secret']);
export const useTaskFavorites = taskFavorites.use;
export const toggleTaskFavorite = taskFavorites.toggle;

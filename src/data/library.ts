import { useSyncExternalStore } from 'react';
import smolIcon from '../assets/tests/smol.png';
import bhsIcon from '../assets/tests/bhs.png';
import sqIcon from '../assets/tests/sq.png';
import ittIcon from '../assets/tests/itt.png';
import bdiIcon from '../assets/tests/bdi.png';
import itoIcon from '../assets/tests/ito.png';
import ocrIcon from '../assets/tests/ocr.png';
import phq9Icon from '../assets/tests/phq9.png';
import gad7Icon from '../assets/tests/gad7.png';
import rsesIcon from '../assets/tests/rses.png';
import pfqIcon from '../assets/tests/5pfq.png';
import scl90Icon from '../assets/tests/scl90.png';
import evidenceIcon from '../assets/tasks/evidence.png';
import pieIcon from '../assets/tasks/pie.png';
import smerIcon from '../assets/tasks/smer.png';
import activationIcon from '../assets/tasks/activation.png';
import worryIcon from '../assets/tasks/worry.png';
import shouldIcon from '../assets/tasks/should.png';
import choiceIcon from '../assets/tasks/choice.png';
import phraseIcon from '../assets/tasks/phrase.png';
import secretIcon from '../assets/tasks/secret.png';

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
  description: string;
  icon: string;
  /** Фон аватарки, накладывается с прозрачностью 75% */
  tint: string;
  /** Какой категории принадлежит тест. В макете не показано, распределение условное */
  categories: C[];
}

export type LibraryTest = LibraryItem<TestCategory>;

// Библиотека всех тестов приложения; порядок как в макете
export const LIBRARY: LibraryTest[] = [
  { id: 'smol', title: 'СМОЛ: Сокращенный многофакторный опросник личности', description: 'Для комплексной оценки личности', icon: smolIcon, tint: '#B3E59F', categories: ['practice', 'hospital'] },
  { id: 'bhs', title: 'BHS: Шкала безнадежности А. Бека', description: 'Для оценки ожиданий', icon: bhsIcon, tint: '#FFD18D', categories: ['hospital'] },
  { id: 'sq', title: 'SQ: Опросник Леонгарда-Шмишека', description: 'Для выявления особенностей личности', icon: sqIcon, tint: '#FED2A4', categories: ['practice'] },
  { id: 'itt', title: 'ИТТ: Интегративный тест тревожности', description: 'Для оценки тревожности', icon: ittIcon, tint: '#FFE177', categories: ['practice', 'project'] },
  { id: 'bdi', title: 'BDI: Шкала депрессии А. Бека', description: 'Для оценки депрессии', icon: bdiIcon, tint: '#FFCEBF', categories: ['hospital'] },
  { id: 'ito', title: 'ИТО: Индивидуально-типологический опросник Л.Н. Собчик', description: 'Для типологической оценки личности', icon: itoIcon, tint: '#F2D1A5', categories: ['practice'] },
  { id: 'ocr', title: 'ОСР: Опросник суицидального риска', description: 'Для выявления суицидального риска', icon: ocrIcon, tint: '#E8EDF2', categories: ['hospital'] },
  { id: 'phq9', title: 'PHQ-9: Опросник депрессивного состояния', description: 'Для оценки депрессии', icon: phq9Icon, tint: '#FFCEBF', categories: ['hospital', 'practice'] },
  { id: 'gad7', title: 'GAD-7: Опросник генерализованного тревожного расстройства', description: 'Для оценки тревожности', icon: gad7Icon, tint: '#FFCEBF', categories: ['practice', 'hospital'] },
  { id: 'rses', title: 'RSES: Шкала самоуважения М. Розенберга', description: 'Для исследования самооценки', icon: rsesIcon, tint: '#FFD782', categories: ['project'] },
  { id: '5pfq', title: '5PFQ: Пятифакторный опросник личности', description: 'Для оценки факторов личности', icon: pfqIcon, tint: '#F7EADC', categories: ['project', 'practice'] },
  { id: 'scl90', title: 'SCL-90: Симптоматический опросник', description: 'Для оценки клинической симптоматики', icon: scl90Icon, tint: '#F9F6F6', categories: ['hospital'] },
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
  { id: 'evidence', title: 'Поиск доказательств', description: 'Для мыслей автоматического характера', icon: evidenceIcon, tint: '#FFCEBF', categories: ['svo'] },
  { id: 'pie', title: 'Пирог ответственности', description: 'Для снижения вины и ответственности', icon: pieIcon, tint: '#6FD7A3', categories: ['svo'] },
  { id: 'smer', title: 'Дневник СМЭР', description: 'Для анализа событий, мыслей, эмоций', icon: smerIcon, tint: '#E19974', categories: ['svo', 'training'] },
  { id: 'activation', title: 'Поведенческая активация', description: 'Для апатии при депрессии и выгорании', icon: activationIcon, tint: '#FFCEBF', categories: ['svo'] },
  { id: 'worry', title: 'Отложенное беспокойство', description: 'Для снижения тревожности', icon: worryIcon, tint: '#B8EA6A', categories: ['svo'] },
  { id: 'should', title: 'Что я должен?', description: 'Для исследования долженствований', icon: shouldIcon, tint: '#C3ECFF', categories: ['training'] },
  { id: 'choice', title: 'Выбор без правильного ответа', description: 'Для дистанционирования от мнений', icon: choiceIcon, tint: '#EAF6FF', categories: ['training'] },
  { id: 'phrase', title: 'Фраза, которую я запомнил', description: 'Для анализа материалов из детства', icon: phraseIcon, tint: '#FFDECF', categories: ['training'] },
  { id: 'secret', title: 'Если никто не узнает', description: 'Для выявления желания', icon: secretIcon, tint: '#F2EBDA', categories: ['training'] },
];

const taskFavorites = createFavorites(['pie', 'activation', 'worry', 'should', 'secret']);
export const useTaskFavorites = taskFavorites.use;
export const toggleTaskFavorite = taskFavorites.toggle;

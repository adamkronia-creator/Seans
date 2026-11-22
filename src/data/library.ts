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
import smolCover from '../assets/tests/covers/smol.webp';
import bhsCover from '../assets/tests/covers/bhs.webp';
import sqCover from '../assets/tests/covers/sq.webp';
import bdiCover from '../assets/tests/covers/bdi.webp';
import ittCover from '../assets/tests/covers/itt.webp';
import itoCover from '../assets/tests/covers/ito.webp';
import ocrCover from '../assets/tests/covers/ocr.webp';
import phq9Cover from '../assets/tests/covers/phq9.webp';
import gad7Cover from '../assets/tests/covers/gad7.webp';
import rsesCover from '../assets/tests/covers/rses.webp';
import pfqCover from '../assets/tests/covers/5pfq.webp';
import scl90Cover from '../assets/tests/covers/scl90.webp';
import evidenceIcon from '../assets/tasks/evidence.webp';
import pieIcon from '../assets/tasks/pie.webp';
import smerIcon from '../assets/tasks/smer.webp';
import activationIcon from '../assets/tasks/activation.webp';
import worryIcon from '../assets/tasks/worry.webp';
import shouldIcon from '../assets/tasks/should.webp';
import choiceIcon from '../assets/tasks/choice.webp';
import phraseIcon from '../assets/tasks/phrase.webp';
import secretIcon from '../assets/tasks/secret.webp';
import evidenceCover from '../assets/tasks/covers/evidence.webp';
import pieCover from '../assets/tasks/covers/pie.webp';
import smerCover from '../assets/tasks/covers/smer.webp';
import activationCover from '../assets/tasks/covers/activation.webp';
import worryCover from '../assets/tasks/covers/worry.webp';
import shouldCover from '../assets/tasks/covers/should.webp';
import choiceCover from '../assets/tasks/covers/choice.webp';
import phraseCover from '../assets/tasks/covers/phrase.webp';
import secretCover from '../assets/tasks/covers/secret.webp';

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
  /** Короткое описание в «Диагностике» или «Заданиях». */
  catalogDescription?: string;
  /** Иллюстрация для крупной карточки в библиотеке. */
  catalogCover?: string;
  /** Краткое описание задания для карточки в чате (две-три строки) */
  blurb?: string;
  icon: string;
  /** Фон аватарки: цвет палитры get-color.ru/pastel, без прозрачности */
  tint: string;
  /** Какой категории принадлежит тест. В макете не показано, распределение условное */
  categories: C[];
}

export type LibraryTest = LibraryItem<TestCategory>;

// Библиотека всех тестов приложения; порядок как в макете
export const LIBRARY: LibraryTest[] = [
  { id: 'smol', title: 'Сокращённый многофакторный опросник личности', abbr: 'СМОЛ', description: 'Для комплексной оценки личности', catalogDescription: 'Комплексная диагностика личности', catalogCover: smolCover, icon: smolIcon, tint: '#A8E4A0', categories: ['training', 'svo'] },
  { id: 'bhs', title: 'Шкала безнадежности А. Бека', abbr: 'BHS', description: 'Для оценки ожиданий', catalogDescription: 'Оценка характера ожиданий', catalogCover: bhsCover, icon: bhsIcon, tint: '#FFDB8B', categories: ['svo'] },
  { id: 'sq', title: 'Опросник Леонгарда-Шмишека', abbr: 'SQ', description: 'Для выявления особенностей личности', catalogDescription: 'Диагностика характера личности', catalogCover: sqCover, icon: sqIcon, tint: '#FAD6A5', categories: ['training'] },
  { id: 'itt', title: 'Интегративный тест тревожности', abbr: 'ИТТ', description: 'Для оценки тревожности', catalogDescription: 'Диагностика тревожности', catalogCover: ittCover, icon: ittIcon, tint: '#FCDD76', categories: ['training', 'svo'] },
  { id: 'bdi', title: 'Шкала депрессии А. Бека', abbr: 'BDI', description: 'Для оценки депрессии', catalogDescription: 'Диагностика депрессии', catalogCover: bdiCover, icon: bdiIcon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'ito', title: 'Индивидуально-типологический опросник Л.Н. Собчик', abbr: 'ИТО', description: 'Для типологической оценки личности', catalogDescription: 'Типологическая диагностика личности', catalogCover: itoCover, icon: itoIcon, tint: '#EDD19C', categories: ['training'] },
  { id: 'ocr', title: 'Опросник суицидального риска', abbr: 'ОСР', description: 'Для выявления суицидального риска', catalogDescription: 'Выявление суицидального риска', catalogCover: ocrCover, icon: ocrIcon, tint: '#E6E6FA', categories: ['svo'] },
  { id: 'phq9', title: 'Опросник депрессивного состояния', abbr: 'PHQ-9', description: 'Для оценки депрессии', catalogDescription: 'Диагностика депрессии', catalogCover: phq9Cover, icon: phq9Icon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'gad7', title: 'Опросник генерализованного тревожного расстройства', abbr: 'GAD-7', description: 'Для оценки тревожности', catalogDescription: 'Диагностика тревожности', catalogCover: gad7Cover, icon: gad7Icon, tint: '#FFBCAD', categories: ['svo'] },
  { id: 'rses', title: 'Шкала самоуважения М. Розенберга', abbr: 'RSES', description: 'Для исследования самооценки', catalogDescription: 'Исследование самооценки', catalogCover: rsesCover, icon: rsesIcon, tint: '#AFEEEE', categories: ['training'] },
  { id: '5pfq', title: 'Пятифакторный опросник личности', abbr: '5PFQ', description: 'Для оценки факторов личности', catalogDescription: 'Комплексная диагностика личности', catalogCover: pfqCover, icon: pfqIcon, tint: '#FFC1CC', categories: ['training'] },
  { id: 'scl90', title: 'Симптоматический опросник', abbr: 'SCL-90', description: 'Для оценки клинической симптоматики', catalogDescription: 'Диагностика клинической симптоматики', catalogCover: scl90Cover, icon: scl90Icon, tint: '#FF9BAA', categories: ['svo'] },
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
    /** Добавить в избранное или убрать сразу несколько (выбор в списке) */
    setMany: (ids: string[], on: boolean) => {
      const next = new Set(favorites);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      favorites = next;
      listeners.forEach((l) => l());
    },
  };
}

const testFavorites = createFavorites(['smol', 'itt', 'bdi', 'ito', '5pfq', 'scl90']);
export const useFavorites = testFavorites.use;
export const toggleFavorite = testFavorites.toggle;
export const setFavorites = testFavorites.setMany;

// ——— Психологические задания ———

// Начальные папки чипсов «Заданий» (после «Все», «Избранное» и «Недавнее»)
export const TASK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'practice', label: 'Практика' },
  { id: 'hospital', label: 'Больница' },
];

export type LibraryTask = LibraryItem<TaskCategory>;

// Библиотека заданий; порядок как в макете, распределение по категориям условное
export const TASK_LIBRARY: LibraryTask[] = [
  { id: 'evidence', title: 'Поиск доказательств', description: 'Для мыслей автоматического характера', catalogDescription: 'Коррекция реакций и мыслей', blurb: 'Проверка тревожной мысли: факты за и против, ошибки мышления и новая, более взвешенная мысль. Помогает снизить уверенность в ней.', catalogCover: evidenceCover, icon: evidenceIcon, tint: '#FFBCAD', categories: ['practice'] },
  { id: 'pie', title: 'Пирог ответственности', description: 'Для снижения вины и ответственности', catalogDescription: 'Снижение вины и ответственности', blurb: 'Разбор ситуации, за исход которой вы чувствуете вину: кто и что на него повлиял. Помогает оценить свою долю ответственности реалистичнее.', catalogCover: pieCover, icon: pieIcon, tint: '#9FE2BF', categories: ['practice'] },
  { id: 'smer', title: 'Дневник СМЭР', description: 'Для анализа событий, мыслей, эмоций', catalogDescription: 'Анализ событий, мыслей и эмоций', blurb: 'Записи о ситуации, мысли, эмоции и реакции. Помогают увидеть связь между событиями, мыслями и чувствами.', catalogCover: smerCover, icon: smerIcon, tint: '#FFB28B', categories: ['practice', 'hospital'] },
  { id: 'activation', title: 'Поведенческая активация', description: 'Для апатии при депрессии и выгорании', catalogDescription: 'Коррекция апатии при депрессии и выгорании', blurb: 'План небольших дел с оценкой удовольствия и важности. Помогает вернуть активность при апатии, депрессии и выгорании.', catalogCover: activationCover, icon: activationIcon, tint: '#FFBCAD', categories: ['hospital'] },
  { id: 'worry', title: 'Отложенное беспокойство', description: 'Для снижения тревожности', catalogDescription: 'Снижение тревожности', blurb: 'Тревожные мысли записываются в течение дня и разбираются в назначенное время. Помогает меньше застревать в беспокойстве.', catalogCover: worryCover, icon: worryIcon, tint: '#C6DF90', categories: ['hospital'] },
  { id: 'should', title: 'Что я должен?', description: 'Для исследования долженствований', catalogDescription: 'Исследование долженствований', blurb: 'Десять предложений о том, что вы считаете себя обязанным делать. Помогает заметить скрытые долженствования и чужие ожидания.', catalogCover: shouldCover, icon: shouldIcon, tint: '#FCE883', categories: ['practice'] },
  { id: 'choice', title: 'Выбор без правильного ответа', description: 'Для дистанцирования от мнений', catalogDescription: 'Прояснение желаний и мотивации', blurb: 'Три решения, которые вы хотели бы принять в ближайший месяц. Помогает отделить собственные желания от чужих мнений.', catalogCover: choiceCover, icon: choiceIcon, tint: '#E6E6FA', categories: ['practice'] },
  { id: 'phrase', title: 'Фраза, которую я запомнил', description: 'Для анализа материалов из детства', catalogDescription: 'Анализ материалов из детства', blurb: 'Фраза значимого взрослого из детства и то, что вы чувствуете, вспоминая её. Помогает увидеть, как она влияет на вас сейчас.', catalogCover: phraseCover, icon: phraseIcon, tint: '#FFE4C4', categories: ['practice'] },
  { id: 'secret', title: 'Если никто не узнает', description: 'Для выявления желаний', catalogDescription: 'Выявление желаний и мотивации', blurb: 'Что бы вы сделали за неделю, если бы никто не узнал о вашем решении. Помогает выявить настоящие желания.', catalogCover: secretCover, icon: secretIcon, tint: '#E6EDF8', categories: ['practice'] },
];

const taskFavorites = createFavorites(['pie', 'activation', 'worry', 'should', 'secret']);
export const useTaskFavorites = taskFavorites.use;
export const toggleTaskFavorite = taskFavorites.toggle;
export const setTaskFavorites = taskFavorites.setMany;

// ——— Закреплённые: идут в списке первыми (тесты и задания закрепляются отдельно) ———
const testPinned = createFavorites([]);
export const usePinned = testPinned.use;
export const setPinned = testPinned.setMany;
const taskPinned = createFavorites([]);
export const useTaskPinned = taskPinned.use;
export const setTaskPinned = taskPinned.setMany;

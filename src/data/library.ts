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

export type TestCategory = 'practice' | 'hospital' | 'project';

// Названия категорий из чипсов макета; последний чипс в макете обрезан («Пр…»), остальные неизвестны
export const TEST_CATEGORIES: { id: TestCategory; label: string }[] = [
  { id: 'practice', label: 'Практика' },
  { id: 'hospital', label: 'Больница' },
  { id: 'project', label: 'Проект' },
];

export interface LibraryTest {
  /** Совпадает с id в журнале клиента (clientStore), если тест уже присылали */
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Фон аватарки, накладывается с прозрачностью 75% */
  tint: string;
  /** Какой категории принадлежит тест. В макете не показано, распределение условное */
  categories: TestCategory[];
}

// Библиотека всех тестов приложения; порядок как в макете
export const LIBRARY: LibraryTest[] = [
  { id: 'smol', title: 'СМОЛ: Сокращенный многофакторный опросник личности', description: 'Для комплексной оценки личности', icon: smolIcon, tint: '#B3E49F', categories: ['practice', 'hospital'] },
  { id: 'bhs', title: 'BHS: Шкала безнадежности А. Бека', description: 'Для оценки ожиданий', icon: bhsIcon, tint: '#FFD08C', categories: ['hospital'] },
  { id: 'sq', title: 'SQ: Опросник Леонгарда-Шмишека', description: 'Для выявления особенностей личности', icon: sqIcon, tint: '#FED2A3', categories: ['practice'] },
  { id: 'itt', title: 'ИТТ: Интегративный тест тревожности', description: 'Для оценки тревожности', icon: ittIcon, tint: '#FFE177', categories: ['practice', 'project'] },
  { id: 'bdi', title: 'BDI: Шкала депрессии А. Бека', description: 'Для оценки депрессии', icon: bdiIcon, tint: '#FFCEBF', categories: ['hospital'] },
  { id: 'ito', title: 'ИТО: Индивидуально-типологический опросник Л. Собчик', description: 'Для типологической оценки личности', icon: itoIcon, tint: '#F2D0A4', categories: ['practice'] },
  { id: 'ocr', title: 'ОСР: Опросник суицидального риска', description: 'Для выявления суицидального риска', icon: ocrIcon, tint: '#E7ECF2', categories: ['hospital'] },
  { id: 'phq9', title: 'PHQ-9: Опросник депрессивного состояния', description: 'Для оценки депрессии', icon: phq9Icon, tint: '#FFCEBF', categories: ['hospital', 'practice'] },
  { id: 'gad7', title: 'GAD-7: Опросник генерализованного тревожного расстройства', description: 'Для оценки тревожности', icon: gad7Icon, tint: '#FFCEBF', categories: ['practice', 'hospital'] },
  { id: 'rses', title: 'RSES: Шкала самоуважения Розенберга', description: 'Для исследования самооценки', icon: rsesIcon, tint: '#FFD782', categories: ['project'] },
  { id: '5pfq', title: '5PFQ: Пятифакторный опросник личности', description: 'Для оценки факторов личности', icon: pfqIcon, tint: '#F7EADC', categories: ['project', 'practice'] },
  { id: 'scl90', title: 'SCL-90-R: Симптоматический опросник', description: 'Для оценки клинической симптоматики', icon: scl90Icon, tint: '#F8F6F6', categories: ['hospital'] },
];

// ——— Избранное: сердечко на карточке включает и выключает тест ———

let favorites: ReadonlySet<string> = new Set(['smol', 'itt', 'bdi', 'ito', '5pfq', 'scl90']);
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => favorites);
}

export function toggleFavorite(id: string) {
  const next = new Set(favorites);
  if (!next.delete(id)) next.add(id);
  favorites = next;
  listeners.forEach((l) => l());
}

import ittIcon from '../assets/tests/itt.png';
import scl90Icon from '../assets/tests/scl90.png';
import pfqIcon from '../assets/tests/5pfq.png';
import rsesIcon from '../assets/tests/rses.png';
import gad7Icon from '../assets/tests/gad7.png';
import phq9Icon from '../assets/tests/phq9.png';

/** assigned — назначено, sent — отправлено клиенту, done — завершено */
export type TestStatus = 'assigned' | 'sent' | 'done';

export interface PsyTest {
  id: string;
  /** Короткое название и полное: «ИТТ: Интегративный тест тревожности» */
  title: string;
  description: string;
  /** Дата назначения, отправки или завершения — по разделу */
  date: string;
  status: TestStatus;
  icon: string;
  /** Цвет фона аватарки, накладывается с прозрачностью 75% */
  tint: string;
}

// Тестовые данные клиента Максима; даты и порядок как в макете
export const TESTS: PsyTest[] = [
  {
    id: 'itt',
    title: 'ИТТ: Интегративный тест тревожности',
    description: 'Для оценки тревожности',
    date: '09.10',
    status: 'sent',
    icon: ittIcon,
    tint: '#FFE177',
  },
  {
    id: 'scl90',
    title: 'SCL-90: Симптоматический опросник',
    description: 'Для оценки клинической симптоматики',
    date: '11.09',
    status: 'done',
    icon: scl90Icon,
    tint: '#F9F6F6',
  },
  {
    id: '5pfq',
    title: '5PFQ: Пятифакторный опросник личности',
    description: 'Для оценки факторов личности',
    date: '09.09',
    status: 'done',
    icon: pfqIcon,
    tint: '#F7EADC',
  },
  {
    id: 'rses',
    title: 'RSES: Шкала самоуважения М. Розенберга',
    description: 'Для исследования самооценки',
    date: '07.09',
    status: 'done',
    icon: rsesIcon,
    tint: '#FFD782',
  },
  {
    id: 'gad7',
    title: 'GAD-7: Опросник генерализованного тревожного расстройства',
    description: 'Для оценки тревожности',
    date: '05.09',
    status: 'done',
    icon: gad7Icon,
    tint: '#FFCEBF',
  },
  {
    id: 'phq9',
    title: 'PHQ-9: Опросник депрессивного состояния',
    description: 'Для оценки депрессии',
    date: '04.09',
    status: 'done',
    icon: phq9Icon,
    tint: '#FFCEBF',
  },
];

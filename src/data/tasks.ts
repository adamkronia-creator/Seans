import type { PsyTest } from './tests';
import smerIcon from '../assets/tasks/smer.png';
import pieIcon from '../assets/tasks/pie.png';
import secretIcon from '../assets/tasks/secret.png';
import phraseIcon from '../assets/tasks/phrase.png';
import choiceIcon from '../assets/tasks/choice.png';
import shouldIcon from '../assets/tasks/should.png';

// Психологические задания клиента Максима; даты и порядок как в макете
export const TASKS: PsyTest[] = [
  {
    id: 'smer',
    title: 'Дневник СМЭР',
    description: 'Для анализа событий, мыслей, эмоций',
    date: '09.10',
    status: 'assigned',
    icon: smerIcon,
    tint: '#E19974',
  },
  {
    id: 'pie',
    title: 'Пирог ответственности',
    description: 'Для снижения вины и ответственности',
    date: '09.10',
    status: 'sent',
    icon: pieIcon,
    tint: '#6FD7A3',
  },
  {
    id: 'secret',
    title: 'Если никто не узнает',
    description: 'Для выявления желания',
    date: '27.09',
    status: 'done',
    icon: secretIcon,
    tint: '#F2EBDA',
  },
  {
    id: 'phrase',
    title: 'Фраза, которую я запомнил',
    description: 'Для анализа материалов из детства',
    date: '19.09',
    status: 'done',
    icon: phraseIcon,
    tint: '#FFDECF',
  },
  {
    id: 'choice',
    title: 'Выбор без правильного ответа',
    description: 'Для дистанционирования от мнений',
    date: '13.09',
    status: 'done',
    icon: choiceIcon,
    tint: '#EAF6FF',
  },
  {
    id: 'should',
    title: 'Что я должен?',
    description: 'Для исследования долженствований',
    date: '07.09',
    status: 'done',
    icon: shouldIcon,
    tint: '#C3ECFF',
  },
];

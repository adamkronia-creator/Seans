import type { ComponentType, SVGProps } from 'react';
import {
  IconCaseAnamnesis,
  IconCaseBirthday,
  IconCaseCalendar,
  IconCaseClient,
  IconCaseClock,
  IconCaseFormat,
  IconCaseGeneral,
  IconCaseHypothesis,
  IconCaseNotePin,
  IconCaseRequest,
  IconCaseScenario,
  IconCaseSignifiers,
  IconCaseStructure,
  IconCaseTransfer,
} from '../icons';
import type { CaseIconId, CaseRowIconId } from '../../data/case';

export type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// Иконки шапок карточек; size — размер файла иконки из Figma (22 или 24)
export const HEAD_ICONS: Record<CaseIconId, { Icon: Icon; size: 22 | 24; label: string }> = {
  general: { Icon: IconCaseGeneral, size: 22, label: 'Человек' },
  anamnesis: { Icon: IconCaseAnamnesis, size: 22, label: 'Анамнез' },
  request: { Icon: IconCaseRequest, size: 22, label: 'Запрос' },
  hypothesis: { Icon: IconCaseHypothesis, size: 24, label: 'Гипотеза' },
  structure: { Icon: IconCaseStructure, size: 22, label: 'Структура' },
  signifiers: { Icon: IconCaseSignifiers, size: 24, label: 'Означающие' },
  scenario: { Icon: IconCaseScenario, size: 24, label: 'Сценарий' },
  transfer: { Icon: IconCaseTransfer, size: 24, label: 'Перенос' },
  pin: { Icon: IconCaseNotePin, size: 22, label: 'Булавка' },
};

export const ROW_ICONS: Record<CaseRowIconId, Icon> = {
  client: IconCaseClient,
  birthday: IconCaseBirthday,
  calendar: IconCaseCalendar,
  clock: IconCaseClock,
  format: IconCaseFormat,
};

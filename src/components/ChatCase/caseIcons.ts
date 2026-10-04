import type { ComponentType, SVGProps } from 'react';
import {
  IconCaseAnamnesis,
  IconCaseBirthday,
  IconCaseCalendar,
  IconCaseClient,
  IconCaseClock,
  IconCaseFormat,
  IconCaseGeneral,
  IconCaseHeadBolt,
  IconCaseHeadCrown,
  IconCaseHeadCross,
  IconCaseHeadDots,
  IconCaseHeadChecklist,
  IconCaseHeadFlame,
  IconCaseHeadBriefcase,
  IconCaseHeadBookmark,
  IconCaseHeadEye,
  IconCaseHeadHospital,
  IconCaseHeadInfo,
  IconCaseHeadStar,
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
export const HEAD_ICONS: Record<CaseIconId, { Icon: Icon; size: 20 | 22 | 24; label: string }> = {
  general: { Icon: IconCaseGeneral, size: 22, label: 'Человек' },
  anamnesis: { Icon: IconCaseAnamnesis, size: 22, label: 'Анамнез' },
  request: { Icon: IconCaseRequest, size: 22, label: 'Запрос' },
  hypothesis: { Icon: IconCaseHypothesis, size: 24, label: 'Гипотеза' },
  structure: { Icon: IconCaseStructure, size: 22, label: 'Структура' },
  signifiers: { Icon: IconCaseSignifiers, size: 24, label: 'Означающие' },
  scenario: { Icon: IconCaseScenario, size: 24, label: 'Сценарий' },
  transfer: { Icon: IconCaseTransfer, size: 24, label: 'Перенос' },
  pin: { Icon: IconCaseNotePin, size: 22, label: 'Булавка' },
  eye: { Icon: IconCaseHeadEye, size: 20, label: 'Глаз' },
  star: { Icon: IconCaseHeadStar, size: 20, label: 'Звезда' },
  info: { Icon: IconCaseHeadInfo, size: 20, label: 'Важно' },
  hospital: { Icon: IconCaseHeadHospital, size: 20, label: 'Больница' },
  crown: { Icon: IconCaseHeadCrown, size: 20, label: 'Корона' },
  bolt: { Icon: IconCaseHeadBolt, size: 20, label: 'Молния' },
  cross: { Icon: IconCaseHeadCross, size: 20, label: 'Отмена' },
  dots: { Icon: IconCaseHeadDots, size: 20, label: 'Ещё' },
  checklist: { Icon: IconCaseHeadChecklist, size: 20, label: 'Проверено' },
  flame: { Icon: IconCaseHeadFlame, size: 20, label: 'Пламя' },
  briefcase: { Icon: IconCaseHeadBriefcase, size: 20, label: 'Портфель' },
  bookmark: { Icon: IconCaseHeadBookmark, size: 20, label: 'Закладка' },
};

export const ROW_ICONS: Record<CaseRowIconId, Icon> = {
  client: IconCaseClient,
  birthday: IconCaseBirthday,
  calendar: IconCaseCalendar,
  clock: IconCaseClock,
  format: IconCaseFormat,
};

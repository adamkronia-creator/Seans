import type { ComponentType, SVGProps } from 'react';
import {
  IconCaseAnamnesis,
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
import heartIcon from '../../assets/icons/solar/heart.svg?react';
import chatIcon from '../../assets/icons/solar/chat-round.svg?react';
import calendarIcon from '../../assets/icons/solar/calendar.svg?react';
import clockIcon from '../../assets/icons/solar/clock-circle.svg?react';
import flagIcon from '../../assets/icons/solar/flag.svg?react';
import goalIcon from '../../assets/icons/solar/circle-dot-dashed.svg?react';
import bookIcon from '../../assets/icons/solar/book-bookmark.svg?react';
import notebookIcon from '../../assets/icons/solar/notebook.svg?react';
import documentIcon from '../../assets/icons/solar/document-text.svg?react';
import folderIcon from '../../assets/icons/solar/folder.svg?react';
import pencilIcon from '../../assets/icons/solar/pen.svg?react';
import attachmentIcon from '../../assets/icons/solar/paperclip.svg?react';
import mindfulnessIcon from '../../assets/icons/solar/meditation-round.svg?react';
import questionIcon from '../../assets/icons/solar/question-circle.svg?react';
import warningIcon from '../../assets/icons/solar/danger-triangle.svg?react';
import keyIcon from '../../assets/icons/solar/key-minimalistic.svg?react';
import lockIcon from '../../assets/icons/solar/lock-keyhole-minimalistic.svg?react';
import placeIcon from '../../assets/icons/solar/map-point.svg?react';
import handHeartIcon from '../../assets/icons/solar/hand-heart-bold.svg?react';
import groupIcon from '../../assets/icons/solar/users-group-rounded-bold.svg?react';
import smileIcon from '../../assets/icons/solar/smile-circle-bold.svg?react';
import dialogIcon from '../../assets/icons/solar/dialog-bold.svg?react';
import targetIcon from '../../assets/icons/solar/target-bold.svg?react';
import graphIcon from '../../assets/icons/solar/graph-up-bold.svg?react';
import ideaIcon from '../../assets/icons/solar/lightbulb-bold.svg?react';
import puzzleIcon from '../../assets/icons/solar/puzzle-bold.svg?react';
import notesBoldIcon from '../../assets/icons/solar/notes-bold.svg?react';
import clipboardCheckIcon from '../../assets/icons/solar/clipboard-check-bold.svg?react';
import layersIcon from '../../assets/icons/solar/layers-bold.svg?react';
import shieldIcon from '../../assets/icons/solar/shield-check-bold.svg?react';
import sunIcon from '../../assets/icons/solar/sun-bold.svg?react';
import moonIcon from '../../assets/icons/solar/moon-bold.svg?react';
import leafIcon from '../../assets/icons/solar/leaf-bold.svg?react';
import compassIcon from '../../assets/icons/solar/compass-bold.svg?react';
import type { CaseIconId } from '../../data/case';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

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
  heart: { Icon: heartIcon, size: 20, label: 'Сердце' },
  chat: { Icon: chatIcon, size: 20, label: 'Разговор' },
  calendar: { Icon: calendarIcon, size: 20, label: 'Календарь' },
  clock: { Icon: clockIcon, size: 20, label: 'Часы' },
  flag: { Icon: flagIcon, size: 20, label: 'Флаг' },
  goal: { Icon: goalIcon, size: 20, label: 'Цель' },
  book: { Icon: bookIcon, size: 20, label: 'Книга' },
  notebook: { Icon: notebookIcon, size: 20, label: 'Блокнот' },
  document: { Icon: documentIcon, size: 20, label: 'Документ' },
  folder: { Icon: folderIcon, size: 20, label: 'Папка' },
  pencil: { Icon: pencilIcon, size: 20, label: 'Карандаш' },
  attachment: { Icon: attachmentIcon, size: 20, label: 'Вложение' },
  mindfulness: { Icon: mindfulnessIcon, size: 20, label: 'Осознанность' },
  question: { Icon: questionIcon, size: 20, label: 'Вопрос' },
  warning: { Icon: warningIcon, size: 20, label: 'Внимание' },
  key: { Icon: keyIcon, size: 20, label: 'Ключ' },
  lock: { Icon: lockIcon, size: 20, label: 'Замок' },
  place: { Icon: placeIcon, size: 20, label: 'Место' },
  handHeart: { Icon: handHeartIcon, size: 20, label: 'Поддержка' },
  group: { Icon: groupIcon, size: 20, label: 'Группа' },
  smile: { Icon: smileIcon, size: 20, label: 'Улыбка' },
  dialog: { Icon: dialogIcon, size: 20, label: 'Диалог' },
  target: { Icon: targetIcon, size: 20, label: 'Мишень' },
  graph: { Icon: graphIcon, size: 20, label: 'Динамика' },
  idea: { Icon: ideaIcon, size: 20, label: 'Идея' },
  puzzle: { Icon: puzzleIcon, size: 20, label: 'Пазл' },
  notesBold: { Icon: notesBoldIcon, size: 20, label: 'Записи' },
  clipboardCheck: { Icon: clipboardCheckIcon, size: 20, label: 'Выполнено' },
  layers: { Icon: layersIcon, size: 20, label: 'Слои' },
  shield: { Icon: shieldIcon, size: 20, label: 'Защита' },
  sun: { Icon: sunIcon, size: 20, label: 'Солнце' },
  moon: { Icon: moonIcon, size: 20, label: 'Луна' },
  leaf: { Icon: leafIcon, size: 20, label: 'Лист' },
  compass: { Icon: compassIcon, size: 20, label: 'Компас' },
};

export const CASE_ICON_GROUPS: { title: string; ids: CaseIconId[] }[] = [
  { title: 'Человек и взаимодействие', ids: ['general', 'anamnesis', 'request', 'transfer', 'heart', 'chat', 'mindfulness', 'hospital', 'handHeart', 'group', 'smile', 'dialog'] },
  { title: 'Наблюдение и анализ', ids: ['hypothesis', 'structure', 'signifiers', 'scenario', 'eye', 'info', 'question', 'warning', 'goal', 'checklist', 'target', 'graph', 'idea', 'puzzle'] },
  { title: 'Заметки и документы', ids: ['pin', 'bookmark', 'book', 'notebook', 'document', 'folder', 'pencil', 'attachment', 'briefcase', 'notesBold', 'clipboardCheck', 'layers', 'shield'] },
  { title: 'События и символы', ids: ['calendar', 'clock', 'place', 'flag', 'star', 'crown', 'bolt', 'flame', 'key', 'lock', 'cross', 'dots', 'sun', 'moon', 'leaf', 'compass'] },
];

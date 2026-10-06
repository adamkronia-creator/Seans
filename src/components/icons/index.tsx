import type { SVGProps } from 'react';

// SVG из Figma; цвета в них заменяются на currentColor (см. vite.config.ts)
export { default as IconPlanner } from '../../assets/icons/tabbar/planner.svg?react';
export { default as IconMessages } from '../../assets/icons/tabbar/messages.svg?react';
export { default as IconTests } from '../../assets/icons/tabbar/psych-tests.svg?react';
export { default as IconTasks } from '../../assets/icons/tabbar/psych-tasks.svg?react';
export { default as IconReading } from '../../assets/icons/tabbar/reading-materials.svg?react';
export { default as IconSearch } from '../../assets/icons/search.svg?react';
export { default as IconBell } from '../../assets/icons/notifications.svg?react';
export { default as IconFavorites } from '../../assets/icons/favorites.svg?react';
export { default as IconBack } from '../../assets/icons/back.svg?react';
export { default as IconChevronRight } from '../../assets/icons/chevron-right.svg?react';
// Иконки типов событий (бейдж 20×20 на аватарке)
export { default as IconEventTask } from '../../assets/icons/event-task.svg?react';
export { default as IconEventSurvey } from '../../assets/icons/event-survey.svg?react';
export { default as IconEventInvite } from '../../assets/icons/event-invite.svg?react';

// Плюс 12×12: нет в присланных иконках, нарисован по размерам из макета
// (чипс «+» и кнопка создания). Размер задаётся через font-size (1em).
export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 .75v10.5M.75 6h10.5" />
    </svg>
  );
}

// Плюс в чипсе «+»: линии длиной 12, толщина 1,5, с округлыми концами, итого 13,5×13,5.
// Размер 1em = 13,5 при font-size 13.5px.
export function IconPlusChip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="-0.75 -0.75 13.5 13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 0v12M0 6h12" />
    </svg>
  );
}

// Экран открытого чата
export { default as IconTabSessions } from '../../assets/icons/chat/tab-sessions.svg?react';
export { default as IconTabMessages } from '../../assets/icons/chat/tab-messages.svg?react';
export { default as IconTabTests } from '../../assets/icons/chat/tab-tests.svg?react';
export { default as IconTabPractices } from '../../assets/icons/chat/tab-practices.svg?react';
export { default as IconTabNotes } from '../../assets/icons/chat/tab-notes.svg?react';
export { default as IconTabLibrary } from '../../assets/icons/chat/tab-library.svg?react';
export { default as IconSettings } from '../../assets/icons/chat/settings.svg?react';
export { default as IconAttach } from '../../assets/icons/chat/attach.svg?react';
export { default as IconEmoji } from '../../assets/icons/chat/emoji.svg?react';
export { default as IconMicrophone } from '../../assets/icons/chat/microphone.svg?react';
export { default as IconReadTicks } from '../../assets/icons/chat/read-ticks.svg?react';
export { default as IconSend } from '../../assets/icons/chat/send.svg?react';

// Вкладка «Кейс»
export { default as IconCaseAdd } from '../../assets/icons/case/add-pencil.svg?react';
export { default as IconCaseAttach } from '../../assets/icons/case/attach-file.svg?react';
export { default as IconCaseFileDownload } from '../../assets/icons/case/file-download.svg?react';
export { default as IconCaseAddNote } from '../../assets/icons/case/add-note.svg?react';
export { default as IconCaseNotePin } from '../../assets/icons/case/note-pin.svg?react';
export { default as IconCaseEdit } from '../../assets/icons/case/edit.svg?react';
export { default as IconCaseLock } from '../../assets/icons/case/note-lock.svg?react';
export { default as IconCaseGeneral } from '../../assets/icons/case/head-general.svg?react';
export { default as IconCaseAnamnesis } from '../../assets/icons/case/head-anamnesis.svg?react';
export { default as IconCaseRequest } from '../../assets/icons/case/head-request.svg?react';
export { default as IconCaseHypothesis } from '../../assets/icons/case/head-hypothesis.svg?react';
export { default as IconCaseStructure } from '../../assets/icons/case/head-structure.svg?react';
export { default as IconCaseSignifiers } from '../../assets/icons/case/head-signifiers.svg?react';
export { default as IconCaseScenario } from '../../assets/icons/case/head-scenario.svg?react';
export { default as IconCaseTransfer } from '../../assets/icons/case/head-transfer.svg?react';
export { default as IconCaseHeadEye } from '../../assets/icons/case/head-eye.svg?react';
export { default as IconCaseHeadStar } from '../../assets/icons/case/head-star.svg?react';
export { default as IconCaseHeadInfo } from '../../assets/icons/case/head-info.svg?react';
export { default as IconCaseHeadHospital } from '../../assets/icons/case/head-hospital.svg?react';
export { default as IconCaseHeadCrown } from '../../assets/icons/case/head-crown.svg?react';
export { default as IconCaseHeadBolt } from '../../assets/icons/case/head-bolt.svg?react';
export { default as IconCaseHeadCross } from '../../assets/icons/case/head-cross.svg?react';
export { default as IconCaseHeadDots } from '../../assets/icons/case/head-dots.svg?react';
export { default as IconCaseHeadChecklist } from '../../assets/icons/case/head-checklist.svg?react';
export { default as IconCaseHeadFlame } from '../../assets/icons/case/head-flame.svg?react';
export { default as IconCaseHeadBriefcase } from '../../assets/icons/case/head-briefcase.svg?react';
export { default as IconCaseHeadBookmark } from '../../assets/icons/case/head-bookmark.svg?react';
export { default as IconCaseClient } from '../../assets/icons/case/row-client.svg?react';
export { default as IconCaseBirthday } from '../../assets/icons/case/row-birthday.svg?react';
export { default as IconCaseCalendar } from '../../assets/icons/case/row-calendar.svg?react';
export { default as IconCaseClock } from '../../assets/icons/case/row-clock.svg?react';
export { default as IconCaseFormat } from '../../assets/icons/case/row-format.svg?react';

// История взаимодействия
export { default as IconStatSessions } from '../../assets/icons/history/stat-sessions.svg?react';
export { default as IconStatTests } from '../../assets/icons/history/stat-tests.svg?react';
export { default as IconStatTasks } from '../../assets/icons/history/stat-tasks.svg?react';
export { default as IconStatNotes } from '../../assets/icons/history/stat-notes.svg?react';
export { default as IconTlNote } from '../../assets/icons/history/tl-note.svg?react';
export { default as IconTlClock } from '../../assets/icons/history/tl-clock.svg?react';
export { default as IconTlDoc } from '../../assets/icons/history/tl-doc.svg?react';
export { default as IconTlFlame } from '../../assets/icons/history/tl-flame.svg?react';
export { default as IconChevron } from '../../assets/icons/history/chevron.svg?react';

// Раздел «Психологические тесты»
export { default as IconHeartRed } from '../../assets/icons/library/heart-red.svg?react';
export { default as IconHeartGray } from '../../assets/icons/library/heart-gray.svg?react';
export { default as IconFilterAll } from '../../assets/icons/library/filter-all.svg?react';
export { default as IconFilterFavorites } from '../../assets/icons/library/filter-favorites.svg?react';
export { default as IconFilterRecent } from '../../assets/icons/library/filter-recent.svg?react';
export { default as IconFilterSettings } from '../../assets/icons/library/settings.svg?react';

// Настройки теста
export { default as IconTestBlank } from '../../assets/icons/test/blank.svg?react';
export { default as IconTestConclusion } from '../../assets/icons/test/conclusion.svg?react';
export { default as IconTestScalesMain } from '../../assets/icons/test/scales-main.svg?react';
export { default as IconTestScalesExtra } from '../../assets/icons/test/scales-extra.svg?react';
export { default as IconTestScoring } from '../../assets/icons/test/scoring.svg?react';
export { default as IconTestQuestions } from '../../assets/icons/test/questions.svg?react';
export { default as IconTestTime } from '../../assets/icons/test/time.svg?react';
export { default as IconTestAge } from '../../assets/icons/test/age.svg?react';
export { default as IconTestGender } from '../../assets/icons/test/gender.svg?react';
export { default as IconTestBlind } from '../../assets/icons/test/blind.svg?react';
export { default as IconTestHide } from '../../assets/icons/test/hide.svg?react';
export { default as IconTestSaveBlank } from '../../assets/icons/test/save-blank.svg?react';
export { default as IconTestMic } from '../../assets/icons/test/mic.svg?react';
export { default as IconTestChevron } from '../../assets/icons/test/chevron-right.svg?react';
export { default as IconTestChevronDown } from '../../assets/icons/test/chevron-down.svg?react';
export { default as IconHeartRedLg } from '../../assets/icons/test/heart-red-lg.svg?react';
export { default as IconHeartGrayLg } from '../../assets/icons/test/heart-gray-lg.svg?react';

// Окно редактирования: строки «Иконка» и «Цвет»
export { default as IconSheetIcon } from '../../assets/icons/sheet/icon-picker.svg?react';
export { default as IconSheetPalette } from '../../assets/icons/sheet/palette.svg?react';

// Инструменты форматирования текста в редакторе
export { default as IconFmtBold } from '../../assets/icons/format/bold.svg?react';
export { default as IconFmtItalic } from '../../assets/icons/format/italic.svg?react';
export { default as IconFmtUnderline } from '../../assets/icons/format/underline.svg?react';
export { default as IconFmtStrike } from '../../assets/icons/format/strike.svg?react';
export { default as IconFmtBullets } from '../../assets/icons/format/list-bullets.svg?react';
export { default as IconFmtNumbers } from '../../assets/icons/format/list-numbers.svg?react';
export { default as IconFmtQuote } from '../../assets/icons/format/quote.svg?react';
export { default as IconFmtUndo } from '../../assets/icons/format/undo.svg?react';
export { default as IconFmtRedo } from '../../assets/icons/format/redo.svg?react';
export { default as IconTestChevronUp } from '../../assets/icons/test/chevron-up.svg?react';
export { default as IconTestMessage } from '../../assets/icons/test/message.svg?react';

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

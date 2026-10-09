import type { ComponentType, SVGProps } from 'react';
import {
  IconMessages,
  IconPlanner,
  IconReading,
  IconTasks,
  IconTests,
} from '../icons';
import './TabBar.css';

export type TabId = 'planner' | 'messages' | 'tests' | 'tasks' | 'reading';

// label — полное название для экранных читалок, short — подпись под значком
const TABS: { id: TabId; label: string; short: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'planner', label: 'Ежедневник', short: 'Ежедневник', Icon: IconPlanner },
  { id: 'messages', label: 'Сообщения', short: 'Сообщения', Icon: IconMessages },
  { id: 'tests', label: 'Психологические тесты', short: 'Тесты', Icon: IconTests },
  { id: 'tasks', label: 'Психологические задания', short: 'Задания', Icon: IconTasks },
  { id: 'reading', label: 'Материалы для чтения', short: 'Материалы', Icon: IconReading },
];

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Разделы">
      {TABS.map(({ id, label, short, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tabbar__item${id === active ? ' tabbar__item--active' : ''}`}
          onClick={() => onChange(id)}
          aria-label={label}
          aria-current={id === active ? 'page' : undefined}
        >
          <Icon />
          <span className="tabbar__label">{short}</span>
        </button>
      ))}
    </nav>
  );
}

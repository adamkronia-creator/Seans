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

// label — название для экранных читалок (подписей под значками нет)
const TABS: { id: TabId; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'planner', label: 'Ежедневник', Icon: IconPlanner },
  { id: 'messages', label: 'Диалоги', Icon: IconMessages },
  { id: 'tests', label: 'Диагностика', Icon: IconTests },
  { id: 'tasks', label: 'Задания', Icon: IconTasks },
  { id: 'reading', label: 'Материалы для чтения', Icon: IconReading },
];

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Разделы">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tabbar__item${id === active ? ' tabbar__item--active' : ''}`}
          onClick={() => onChange(id)}
          aria-label={label}
          aria-current={id === active ? 'page' : undefined}
        >
          <Icon />
        </button>
      ))}
    </nav>
  );
}

import type { ComponentType, SVGProps } from 'react';
import {
  IconMessages,
  IconProfile,
  IconTasks,
  IconTests,
} from '../icons';
import { Badge } from '../Badge/Badge';
import { useUnreadTotal } from '../../data/chatStore';
import './TabBar.css';

export type TabId = 'messages' | 'tests' | 'tasks' | 'profile';

// label — название для экранных читалок (подписей под значками нет)
const TABS: { id: TabId; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'tasks', label: 'Задания', Icon: IconTasks },
  { id: 'tests', label: 'Диагностика', Icon: IconTests },
  { id: 'messages', label: 'Диалоги', Icon: IconMessages },
  { id: 'profile', label: 'Профиль', Icon: IconProfile },
];

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const unread = useUnreadTotal();
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
          aria-description={id === 'messages' && unread > 0 ? `Непрочитанных чатов: ${unread}` : undefined}
        >
          <span className="tabbar__icon">
            <Icon />
            {id === 'messages' && unread > 0 && (
              <span className="tabbar__badge" aria-hidden="true">
                <Badge count={unread} />
              </span>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}

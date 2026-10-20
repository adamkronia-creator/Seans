import { useEffect, useState, type ComponentType, type CSSProperties, type SVGProps } from 'react';
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

/** Раздел, на котором панель стояла в прошлый раз: у каждого экрана своя панель, и плашка новой начинает с места прежней и скользит к своему */
let lastIndex: number | null = null;

export function TabBar({ active, onChange }: TabBarProps) {
  const unread = useUnreadTotal();
  const target = TABS.findIndex((t) => t.id === active);
  const [shown, setShown] = useState(lastIndex ?? target);
  useEffect(() => {
    lastIndex = target;
    if (shown === target) return;
    // Плашка сначала рисуется на старом месте, и только потом получает новое: тогда переход виден
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(target)));
    return () => cancelAnimationFrame(id);
  }, [target, shown]);
  return (
    // Внешняя обёртка — стекло: размывает то, что под капсулой, и больше ничего. Само имя для перехода (view-transition-name) получает
    // внутренняя панель (заливка, рамка, значки, плашка): у элемента с таким именем собственное размытие в Chrome пропадает, и на время
    // перехода капсула мигала бы чёткими строками под ней (стили — в pm-chats.css и motion.css)
    <div className="tabbar-glass">
      <nav className="tabbar" aria-label="Разделы" style={{ '--tab-index': shown } as CSSProperties}>
        {/* Подвижная плашка выбранного раздела (видна у плавающей капсулы, см. pm-chats.css): при смене раздела скользит к новому */}
        <span className="tabbar__pill" aria-hidden="true" />
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
    </div>
  );
}

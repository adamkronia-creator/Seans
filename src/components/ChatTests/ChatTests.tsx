import { Badge } from '../Badge/Badge';
import { TestCard } from '../TestCard/TestCard';
import { TASKS } from '../../data/tasks';
import { TESTS, type PsyTest, type TestStatus } from '../../data/tests';
import './ChatTests.css';

interface SectionConfig {
  status: TestStatus;
  title: string;
  badge: 'accent' | 'yellow' | 'green';
  /** Есть ссылка «Напомнить» справа */
  remind?: boolean;
}

const TEST_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', badge: 'yellow', remind: true },
  { status: 'done', title: 'Завершенные', badge: 'green' },
];

const TASK_SECTIONS: SectionConfig[] = [
  { status: 'assigned', title: 'Назначенные', badge: 'accent', remind: true },
  { status: 'sent', title: 'Отправленные', badge: 'yellow', remind: true },
  { status: 'done', title: 'Завершенные', badge: 'green' },
];

/** Разделы со списками карточек: общий вид для вкладок «Тесты» и «Задания» */
function SectionedList({ items, sections }: { items: PsyTest[]; sections: SectionConfig[] }) {
  return (
    <div className="chat-tests">
      {sections.map(({ status, title, badge, remind }) => {
        const list = items.filter((t) => t.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status} className="chat-tests__section">
            <div className="chat-tests__heading">
              <h2 className="chat-tests__title">{title}</h2>
              <Badge count={list.length} variant={badge} ariaLabel={`Всего: ${list.length}`} />
              {remind && (
                <button type="button" className="chat-tests__remind">
                  Напомнить
                </button>
              )}
            </div>
            <ul className="chat-tests__list">
              {list.map((item) => (
                <TestCard key={item.id} test={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Вкладка «Тесты» в открытом чате */
export function ChatTests() {
  return <SectionedList items={TESTS} sections={TEST_SECTIONS} />;
}

/** Вкладка «Задания» в открытом чате */
export function ChatTasks() {
  return <SectionedList items={TASKS} sections={TASK_SECTIONS} />;
}

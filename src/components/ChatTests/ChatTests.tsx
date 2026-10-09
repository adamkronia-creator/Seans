import { Badge } from '../Badge/Badge';
import { TestCard } from '../TestCard/TestCard';
import { itemsWithStatus, useClientData } from '../../data/clientStore';
import { LIBRARY } from '../../data/library';
import { useSelfResults } from '../../data/selfTest';
import type { PsyTest, TestStatus } from '../../data/tests';
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
function SectionedList({
  items,
  sections,
  emptyText,
  onOpen,
}: {
  items: PsyTest[];
  sections: SectionConfig[];
  emptyText: string;
  /** Нажатие на карточку; у заданий пока не задано */
  onOpen?: (item: PsyTest) => void;
}) {
  if (items.length === 0) return <p className="chat-tests__empty">{emptyText}</p>;
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
                <TestCard key={item.id} test={item} onClick={onOpen} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Вкладка «Тесты» в открытом чате: отправленный тест открывает его настройку, завершённый — результат клиента */
export function ChatTests({
  hasData,
  onOpenTest,
  onOpenResult,
}: {
  hasData: boolean;
  onOpenTest?: (id: string) => void;
  onOpenResult?: (id: string) => void;
}) {
  const data = useClientData();
  return (
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'test') : []}
      sections={TEST_SECTIONS}
      emptyText="Тесты ещё не отправлялись"
      onOpen={(t) => (t.status === 'done' ? onOpenResult?.(t.id) : onOpenTest?.(t.id))}
    />
  );
}

/** Вкладка «Тесты» в чате «Избранное»: тесты, которые психолог прошёл сам, новые сверху */
export function SelfTests({ onOpen }: { onOpen: (resultId: string) => void }) {
  const results = useSelfResults();
  const items = results.flatMap<PsyTest>((r) => {
    const test = LIBRARY.find((t) => t.id === r.testId);
    // id карточки — id результата: по нему открывается заключение
    return test ? [{ id: r.id, title: test.title, description: test.description, date: r.date, status: 'done', icon: test.icon, tint: test.tint }] : [];
  });
  return (
    <SectionedList
      items={items}
      sections={TEST_SECTIONS.filter((s) => s.status === 'done')}
      emptyText="Пройденных тестов пока нет"
      onOpen={(t) => onOpen(t.id)}
    />
  );
}

/** Вкладка «Задания» в открытом чате */
export function ChatTasks({ hasData }: { hasData: boolean }) {
  const data = useClientData();
  return (
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'task') : []}
      sections={TASK_SECTIONS}
      emptyText="Заданий пока нет"
    />
  );
}

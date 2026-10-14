import { EmptyState } from '../EmptyState/EmptyState';
import { IconTabPractices, IconTabTests } from '../icons';
import { TestCard } from '../TestCard/TestCard';
import { itemsWithStatus, useClientData } from '../../data/clientStore';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { useTaskResults } from '../../data/selfTask';
import { useSelfResults } from '../../data/selfTest';
import type { PsyTest, TestStatus } from '../../data/tests';
import './ChatTests.css';

/** Что показать, когда во вкладке ничего нет: что именно пусто и что делать дальше */
interface EmptyConfig {
  kind: 'test' | 'task';
  title: string;
  text: string;
}

interface SectionConfig {
  status: TestStatus;
  title: string;
  /** Есть ссылка «Напомнить» справа */
  remind?: boolean;
}

const TEST_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', remind: true },
  { status: 'done', title: 'Завершенные' },
];

const TASK_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', remind: true },
  { status: 'permanent', title: 'Постоянные' },
  { status: 'done', title: 'Завершенные' },
];

/** Разделы со списками карточек: общий вид для вкладок «Тесты» и «Задания» */
function SectionedList({
  items,
  sections,
  empty,
  onOpen,
}: {
  items: PsyTest[];
  sections: SectionConfig[];
  empty: EmptyConfig;
  /** Нажатие на карточку */
  onOpen?: (item: PsyTest) => void;
}) {
  if (items.length === 0) {
    return <EmptyState icon={empty.kind === 'test' ? <IconTabTests /> : <IconTabPractices />} title={empty.title} text={empty.text} />;
  }
  return (
    <div className="chat-tests">
      {sections.map(({ status, title, remind }) => {
        const list = items.filter((t) => t.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status} className="chat-tests__section">
            <div className="chat-tests__heading">
              <h2 className="chat-tests__title">{title}</h2>
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
      empty={{ kind: 'test', title: 'Тесты ещё не отправлялись', text: 'Отправьте тест из раздела «Диагностика» — он появится здесь.' }}
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
      empty={{ kind: 'test', title: 'Пройденных тестов пока нет', text: 'Тесты, которые вы пройдёте сами, будут храниться здесь.' }}
      onOpen={(t) => onOpen(t.id)}
    />
  );
}

/**
 * Вкладка «Задания» в открытом чате: отправленное задание открывает его настройку, выполненное — результат клиента.
 * Постоянное задание стоит в своём разделе с числом записей, а каждая новая запись клиента появляется среди завершённых
 * отдельной карточкой: её можно открыть и посмотреть.
 */
export function ChatTasks({
  hasData,
  onOpenTask,
  onOpenResult,
}: {
  hasData: boolean;
  onOpenTask?: (id: string) => void;
  onOpenResult?: (id: string) => void;
}) {
  const data = useClientData();
  return (
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'task') : []}
      sections={TASK_SECTIONS}
      empty={{ kind: 'task', title: 'Заданий пока нет', text: 'Отправьте задание из раздела «Задания» — оно появится здесь.' }}
      onOpen={(t) => (t.status === 'done' ? onOpenResult?.(t.id) : onOpenTask?.(t.id))}
    />
  );
}

/** Вкладка «Задания» в чате «Избранное»: задания, которые психолог выполнил сам, новые сверху */
export function SelfTasks({ onOpen }: { onOpen: (resultId: string) => void }) {
  const results = useTaskResults();
  const items = results.flatMap<PsyTest>((r) => {
    const task = TASK_LIBRARY.find((t) => t.id === r.taskId);
    // id карточки — id результата: по нему открывается экран результата
    return task
      ? [{ id: r.id, title: task.title, description: r.record ? `Запись ${r.record}` : task.description, date: r.date, status: 'done', icon: task.icon, tint: task.tint }]
      : [];
  });
  return (
    <SectionedList
      items={items}
      sections={TASK_SECTIONS.filter((s) => s.status === 'done')}
      empty={{ kind: 'task', title: 'Выполненных заданий пока нет', text: 'Задания, которые вы выполните сами, будут храниться здесь.' }}
      onOpen={(t) => onOpen(t.id)}
    />
  );
}

import type { DiagramKind } from '../Diagram/Diagram';
import { Badge } from '../Badge/Badge';
import { EmptyState } from '../EmptyState/EmptyState';
import { TestCard } from '../TestCard/TestCard';
import { itemsWithStatus, useClientData } from '../../data/clientStore';
import { LIBRARY } from '../../data/library';
import { useSelfResults } from '../../data/selfTest';
import type { PsyTest, TestStatus } from '../../data/tests';
import './ChatTests.css';

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
  { status: 'assigned', title: 'Назначенные', remind: true },
  { status: 'sent', title: 'Отправленные', remind: true },
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
  /** Что показать, когда список пуст: название, пояснение и кнопка (если есть куда идти) */
  empty: { art: DiagramKind; title: string; text: string; action?: { label: string; onClick: () => void } };
  /** Нажатие на карточку; у заданий пока не задано */
  onOpen?: (item: PsyTest) => void;
}) {
  if (items.length === 0) return <EmptyState art={empty.art} title={empty.title} text={empty.text} action={empty.action} />;
  return (
    <div className="chat-tests">
      {sections.map(({ status, title, remind }) => {
        const list = items.filter((t) => t.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status} className="chat-tests__section">
            <div className="chat-tests__heading">
              <h2 className="chat-tests__title">{title}</h2>
              <Badge count={list.length} variant="neutral" ariaLabel={`Всего: ${list.length}`} />
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
  onOpenLibrary,
}: {
  hasData: boolean;
  onOpenTest?: (id: string) => void;
  onOpenResult?: (id: string) => void;
  /** Перейти в раздел «Диагностика» за новым тестом */
  onOpenLibrary?: () => void;
}) {
  const data = useClientData();
  return (
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'test') : []}
      sections={TEST_SECTIONS}
      empty={{
        art: 'bell',
        title: 'Тестов пока нет',
        text: 'Отправьте клиенту тест из раздела «Диагностика»: он придет в диалог, а результат сохранится здесь.',
        action: onOpenLibrary && { label: 'Выбрать тест', onClick: onOpenLibrary },
      }}
      onOpen={(t) => (t.status === 'done' ? onOpenResult?.(t.id) : onOpenTest?.(t.id))}
    />
  );
}

/** Вкладка «Тесты» в чате «Избранное»: тесты, которые психолог прошёл сам, новые сверху */
export function SelfTests({ onOpen, onOpenLibrary }: { onOpen: (resultId: string) => void; onOpenLibrary?: () => void }) {
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
      empty={{
        art: 'bell',
        title: 'Пройденных тестов пока нет',
        text: 'Пройдите тест сами: заключение и бланк сохранятся здесь, и вы сможете вернуться к ним.',
        action: onOpenLibrary && { label: 'Открыть диагностику', onClick: onOpenLibrary },
      }}
      onOpen={(t) => onOpen(t.id)}
    />
  );
}

/** Вкладка «Задания» в открытом чате */
export function ChatTasks({ hasData, onOpenLibrary }: { hasData: boolean; onOpenLibrary?: () => void }) {
  const data = useClientData();
  return (
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'task') : []}
      sections={TASK_SECTIONS}
      empty={{
        art: 'abc',
        title: 'Заданий пока нет',
        text: 'Назначьте задание из раздела «Задания»: оно придет клиенту в диалог, а выполненное появится здесь.',
        action: onOpenLibrary && { label: 'Выбрать задание', onClick: onOpenLibrary },
      }}
    />
  );
}

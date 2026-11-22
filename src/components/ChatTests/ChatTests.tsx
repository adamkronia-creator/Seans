import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import { Chip } from '../Chip/Chip';
import { EmptyState } from '../EmptyState/EmptyState';
import { SwipePager } from '../SwipePager/SwipePager';
import { IconTabPractices, IconTabTests } from '../icons';
import { ChatActivityCard } from './ChatActivityCard';
import { StatusRow } from './StatusRow';
import { findClientResult } from '../../data/clientResults';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { CLIENT_CHAT, itemsWithStatus, useClientData } from '../../data/clientStore';
import { clientResultId } from '../../data/resultLinks';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { taskApproachLabel } from '../../data/libraryMeta';
import { useTaskResult, useTaskResults } from '../../data/selfTask';
import { useSelfResults } from '../../data/selfTest';
import { TASKS } from '../../data/taskContent';
import { testCardDescription, testSettings } from '../../data/testSettings';
import type { PsyTest, TestStatus } from '../../data/tests';
import { centerChips } from '../../utils/centerChips';
import { followChips, type PositionVia } from '../../utils/followChips';
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
  empty: string;
}

const TEST_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', empty: 'Нет тестов, ожидающих ответа' },
  { status: 'done', title: 'Завершённые', empty: 'Нет завершённых тестов' },
];

const TASK_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', empty: 'Нет заданий, ожидающих ответа' },
  { status: 'permanent', title: 'Назначенные', empty: 'Нет назначенных заданий' },
  { status: 'done', title: 'Завершённые', empty: 'Нет завершённых заданий' },
];

const introParagraph = (intro?: string) => intro?.split('\n\n', 1)[0].trim();

const taskDescription = (taskId: string | undefined) => TASK_LIBRARY.find((t) => t.id === taskId)?.description;

/** Выполненное задание: дата берётся из результата (у записи постоянного задания добавлен её номер) */
function DoneTaskRow({ item, onOpen }: { item: PsyTest; onOpen: (id: string) => void }) {
  const resultId = item.id;
  const result = useTaskResult(resultId) ?? findClientTaskResult(resultId);
  const date = result?.info.date ?? item.date;
  return (
    <StatusRow
      item={item}
      description={taskDescription(result?.taskId)}
      facts={result?.record ? `Запись № ${result.record}` : 'Выполнено'} time={date}
      onOpen={() => onOpen(resultId)}
    />
  );
}

/** Собственные результаты в чате «Избранное». */
function CompletedList({ items, empty, renderCard }: {
  items: PsyTest[];
  empty: EmptyConfig;
  renderCard: (item: PsyTest) => ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState icon={empty.kind === 'test' ? <IconTabTests /> : <IconTabPractices />} title={empty.title} text={empty.text} />;
  }
  return (
    <div className="chat-tests">
      <section className="chat-tests__section">
        <div className="chat-tests__heading">
          <h2 className="chat-tests__title">Завершённые</h2>
          <Badge count={items.length} variant="neutral" />
        </div>
        <ul className="chat-tests__list">{items.map(renderCard)}</ul>
      </section>
    </div>
  );
}

/** Отправленные материалы клиента: отдельная прокручиваемая страница для каждого статуса. */
function ChatActivityList({ empty, items, renderCard }: {
  empty: EmptyConfig;
  items: PsyTest[];
  renderCard: (item: PsyTest) => ReactNode;
}) {
  const statuses = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<TestStatus | null>(null);
  const isTest = empty.kind === 'test';
  const icon = isTest ? <IconTabTests /> : <IconTabPractices />;
  const sections = (isTest ? TEST_SECTIONS : TASK_SECTIONS)
    .map((section) => ({ ...section, items: items.filter((item) => item.status === section.status) }));
  const index = Math.max(0, sections.findIndex((section) => filter === null ? section.items.length > 0 : section.status === filter));
  const hasItems = items.length > 0;
  const chipPosition = useRef(index);
  const moveStatusPill = useCallback((position: number, via?: PositionVia) => {
    chipPosition.current = position;
    const row = statuses.current;
    if (!row) return;
    followChips(row.querySelectorAll<HTMLButtonElement>('.chip'), position, via);
    centerChips(row, position, '.chip', via);
  }, []);

  useLayoutEffect(() => {
    const row = statuses.current;
    if (!row) return;
    const place = () => moveStatusPill(chipPosition.current);
    place();
    const resize = new ResizeObserver(place);
    row.querySelectorAll('.chip').forEach((chip) => resize.observe(chip));
    resize.observe(row);
    return () => resize.disconnect();
  }, [hasItems, moveStatusPill]);

  if (!hasItems) {
    return <EmptyState icon={icon} title={empty.title} text={empty.text} />;
  }

  const pages = sections.map(({ status, items, empty }) => ({
    key: status,
    node: (
      <div className="chat-tests__status-page">
        {items.length === 0 ? <EmptyState icon={icon} title={empty} /> : (
          <ul className="chat-tests__catalog catalog-cards">{items.map(renderCard)}</ul>
        )}
      </div>
    ),
  }));

  return (
    <div className="chat-tests chat-tests--catalog">
      <div ref={statuses} className="screen-header__chips chat-tests__filters" role="group" aria-label={isTest ? 'Статусы опросников' : 'Статусы заданий'} data-hscroll>
        <span className="chips-pill" aria-hidden="true" />
        {sections.map(({ status, items, title }, position) => (
          <Chip key={status} follow active={index === position} count={items.length} onClick={() => setFilter(status)}>{title}</Chip>
        ))}
      </div>
      <SwipePager nested index={index} pages={pages} onIndexChange={(next) => setFilter(sections[next].status)} onPosition={moveStatusPill} />
    </div>
  );
}

interface TabProps {
  onCardMenu: (id: string, opener: HTMLButtonElement) => void;
  /** Отмеченные карточки (null — выбора нет) и отметка карточки */
  selected?: string[] | null;
  onPick?: (id: string) => void;
  /** Напомнить клиенту о том, что ждёт ответа */
  onRemind?: (items: PsyTest[]) => void;
}

/** Вкладка «Опросники» в открытом чате: отправленный тест открывает его настройку, пройденный — результат клиента */
export function ChatTests({
  hasData,
  onCardMenu,
  onOpenTest,
  onOpenResult,
  selected,
  onPick,
  onRemind,
}: TabProps & {
  hasData: boolean;
  onOpenTest?: (id: string) => void;
  onOpenResult?: (id: string) => void;
}) {
  const data = useClientData();
  return (
    <ChatActivityList
      items={hasData ? itemsWithStatus(data, 'test') : []}
      empty={{ kind: 'test', title: 'Тесты ещё не отправлялись', text: 'Отправьте тест из раздела «Диагностика» — он появится здесь.' }}
      renderCard={(item) => {
        const test = LIBRARY.find((entry) => entry.id === item.id);
        const done = item.status === 'done';
        const result = done ? findClientResult(clientResultId(CLIENT_CHAT, item.id))?.data : undefined;
        return (
          <ChatActivityCard
            key={item.id}
            kind="test"
            item={item}
            cover={test?.catalogCover}
            badge={done ? test?.abbr : undefined}
            date={item.fullDate || result?.info.date || item.date}
            result={result}
            description={testCardDescription(item.id) ?? introParagraph(test && testSettings(test).intro)}
            onOpen={() => done ? onOpenResult?.(item.id) : onOpenTest?.(item.id)}
            onMenu={onCardMenu}
            onRemind={!done && onRemind ? () => onRemind([item]) : undefined}
            selecting={Boolean(selected)}
            selected={selected?.includes(item.id)}
            onPick={onPick}
          />
        );
      }}
    />
  );
}

/** Вкладка «Опросники» в чате «Избранное»: тесты, которые психолог прошёл сам, новые сверху */
export function SelfTests({ onOpen }: { onOpen: (resultId: string) => void }) {
  const results = useSelfResults();
  const items = results.flatMap<PsyTest>((r) => {
    const test = LIBRARY.find((t) => t.id === r.testId);
    // id карточки — id результата: по нему открывается заключение
    return test ? [{ id: r.id, title: test.title, description: test.description, date: r.date, status: 'done', icon: test.icon, tint: test.tint }] : [];
  });
  return (
    <CompletedList
      items={items}
      empty={{ kind: 'test', title: 'Пройденных тестов пока нет', text: 'Тесты, которые вы пройдёте сами, будут храниться здесь.' }}
      renderCard={(item) => <StatusRow key={item.id} item={item} facts="Пройден" time={results.find((r) => r.id === item.id)?.data?.info.date ?? item.date} badgeLabel="Пройден" onOpen={(t) => onOpen(t.id)} />}
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
  onCardMenu,
  onOpenTask,
  onOpenResult,
  selected,
  onPick,
  onRemind,
}: TabProps & {
  hasData: boolean;
  onOpenTask?: (id: string) => void;
  onOpenResult?: (id: string) => void;
}) {
  const data = useClientData();
  return (
    <ChatActivityList
      items={hasData ? itemsWithStatus(data, 'task') : []}
      empty={{ kind: 'task', title: 'Заданий пока нет', text: 'Отправьте задание из раздела «Задания» — оно появится здесь.' }}
      renderCard={(item) => {
        const done = item.status === 'done';
        const result = done ? findClientTaskResult(clientResultId(CLIENT_CHAT, item.id)) : undefined;
        const taskId = item.record?.taskId ?? item.id;
        const task = TASK_LIBRARY.find((task) => task.id === taskId);
        const details = item.record ? `Запись № ${item.record.number}` : item.records && item.description;
        return (
          <ChatActivityCard
            key={item.id}
            kind="task"
            item={item}
            cover={task?.catalogCover}
            badge={taskApproachLabel(taskId)}
            date={result?.info.date ?? item.records?.since ?? item.fullDate ?? item.date}
            description={introParagraph(TASKS[taskId]?.intro) ?? task?.description}
            details={details}
            onOpen={() => done ? onOpenResult?.(item.id) : onOpenTask?.(item.id)}
            onMenu={onCardMenu}
            onRemind={item.status === 'sent' && onRemind ? () => onRemind([item]) : undefined}
            selecting={Boolean(selected)}
            selected={selected?.includes(item.id)}
            onPick={onPick}
          />
        );
      }}
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
    <CompletedList
      items={items}
      empty={{ kind: 'task', title: 'Выполненных заданий пока нет', text: 'Задания, которые вы выполните сами, будут храниться здесь.' }}
      renderCard={(item) => <DoneTaskRow key={item.id} item={item} onOpen={onOpen} />}
    />
  );
}

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import { Chip } from '../Chip/Chip';
import { EmptyState } from '../EmptyState/EmptyState';
import { IconTabPractices, IconTabTests } from '../icons';
import type { PickProps } from '../ChatCase/ChatCase';
import { ActivityCard } from './ActivityCard';
import { ChatTestCard } from './ChatTestCard';
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
import { followChips } from '../../utils/followChips';
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

const COMPLETED_TEST_SECTIONS: SectionConfig[] = [
  { status: 'done', title: 'Завершённые' },
];

const TASK_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', remind: true },
  { status: 'permanent', title: 'Назначенные' },
  { status: 'done', title: 'Завершённые' },
];

const introParagraph = (intro?: string) => intro?.split('\n\n', 1)[0].trim();

const taskDescription = (taskId: string | undefined) => TASK_LIBRARY.find((t) => t.id === taskId)?.description;

/** Выполненное задание: дата берётся из результата (у записи постоянного задания добавлен её номер) */
function DoneTaskRow({ item, resultId, onOpen, ...pick }: PickProps & { item: PsyTest; resultId: string; onOpen: (item: PsyTest) => void }) {
  const result = useTaskResult(resultId) ?? findClientTaskResult(resultId);
  const date = result?.info.date ?? item.date;
  return (
    <StatusRow
      item={item}
      description={taskDescription(result?.taskId)}
      facts={result?.record ? `Запись № ${result.record}` : 'Выполнено'} time={date}
      onOpen={onOpen}
      {...pick}
    />
  );
}

/** Разделы с карточками: общий вид для вкладок «Опросники» и «Задания» */
function SectionedList({
  items,
  sections,
  empty,
  renderCard,
  onRemind,
  selected,
  onPick,
}: {
  items: PsyTest[];
  sections: SectionConfig[];
  empty: EmptyConfig;
  /** Карточка одного элемента; отметка выбора приходит готовой */
  renderCard: (item: PsyTest, pick: PickProps) => ReactNode;
  /** Напомнить клиенту о тестах или заданиях, которые ждут ответа */
  onRemind?: (items: PsyTest[]) => void;
  /** Отмеченные карточки (null — выбора нет) и отметка карточки; долгое нажатие начинает выбор */
  selected?: string[] | null;
  onPick?: (id: string) => void;
}) {
  const pickProps = (id: string): PickProps => ({ selecting: Boolean(selected), selected: Boolean(selected?.includes(id)), onPick });
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
              <Badge count={list.length} variant="neutral" />
              {remind && (
                <button type="button" className="chat-tests__remind" onClick={() => onRemind?.(list)}>
                  {list.length > 1 ? 'Напомнить всем' : 'Напомнить'}
                </button>
              )}
            </div>
            <ul className="chat-tests__list">{list.map((item) => renderCard(item, pickProps(item.id)))}</ul>
          </section>
        );
      })}
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
  const scroller = useRef<HTMLDivElement>(null);
  const statuses = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'sent' | 'done' | null>(null);
  const items = hasData ? itemsWithStatus(data, 'test') : [];
  const sent = items.filter((item) => item.status === 'sent');
  const done = items.filter((item) => item.status === 'done');
  const active = filter ?? (sent.length > 0 ? 'sent' : 'done');
  const shown = active === 'sent' ? sent : done;
  const hasItems = items.length > 0;

  useLayoutEffect(() => {
    const row = statuses.current;
    if (!row) return;
    const chips = row.querySelectorAll<HTMLButtonElement>('.chip');
    const place = () => followChips(chips, active === 'sent' ? 0 : 1);
    place();
    const resize = new ResizeObserver(place);
    chips.forEach((chip) => resize.observe(chip));
    return () => resize.disconnect();
  }, [active, hasItems]);

  const selectStatus = (next: 'sent' | 'done') => {
    if (next === active) return;
    setFilter(next);
    if (scroller.current) scroller.current.scrollTop = 0;
  };

  if (!hasItems) {
    return <EmptyState icon={<IconTabTests />} title="Тесты ещё не отправлялись" text="Отправьте тест из раздела «Диагностика» — он появится здесь." />;
  }

  return (
    <div ref={scroller} className="chat-tests chat-tests--catalog">
      <div ref={statuses} className="screen-header__chips chat-tests__filters" role="group" aria-label="Статусы опросников" data-hscroll>
        <span className="chips-pill" aria-hidden="true" />
        <Chip follow active={active === 'sent'} count={sent.length} onClick={() => selectStatus('sent')}>Отправленные</Chip>
        <Chip follow active={active === 'done'} count={done.length} onClick={() => selectStatus('done')}>Завершённые</Chip>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<IconTabTests />} title={active === 'sent' ? 'Нет тестов, ожидающих ответа' : 'Нет завершённых тестов'} />
      ) : (
        <ul key={active} className="chat-tests__catalog catalog-cards" data-status-changed={filter !== null || undefined}>
          {shown.map((item) => {
            const test = LIBRARY.find((entry) => entry.id === item.id);
            const completed = item.status === 'done';
            const result = completed ? findClientResult(clientResultId(CLIENT_CHAT, item.id))?.data : undefined;
            return (
              <ChatTestCard
                key={item.id}
                item={item}
                test={test}
                result={result}
                description={testCardDescription(item.id) ?? introParagraph(test && testSettings(test).intro)}
                onOpen={() => completed ? onOpenResult?.(item.id) : onOpenTest?.(item.id)}
                onMenu={onCardMenu}
                onRemind={!completed && onRemind ? () => onRemind([item]) : undefined}
                selecting={Boolean(selected)}
                selected={selected?.includes(item.id)}
                onPick={onPick}
              />
            );
          })}
        </ul>
      )}
    </div>
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
    <SectionedList
      items={items}
      sections={COMPLETED_TEST_SECTIONS}
      empty={{ kind: 'test', title: 'Пройденных тестов пока нет', text: 'Тесты, которые вы пройдёте сами, будут храниться здесь.' }}
      renderCard={(item, pick) => <StatusRow key={item.id} item={item} facts="Пройден" time={results.find((r) => r.id === item.id)?.data?.info.date ?? item.date} badgeLabel="Пройден" onOpen={(t) => onOpen(t.id)} {...pick} />}
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
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'task') : []}
      sections={TASK_SECTIONS}
      empty={{ kind: 'task', title: 'Заданий пока нет', text: 'Отправьте задание из раздела «Задания» — оно появится здесь.' }}
      renderCard={(item, pick) => {
        const done = item.status === 'done';
        const assigned = item.status === 'permanent';
        const result = done ? findClientTaskResult(clientResultId(CLIENT_CHAT, item.id)) : undefined;
        const taskId = result?.taskId ?? item.id;
        const task = TASK_LIBRARY.find((task) => task.id === taskId);
        const category = taskApproachLabel(taskId);
        const details = result?.record
          ? `Запись № ${result.record}`
          : assigned && /^Записей/.test(item.description) ? item.description : undefined;
        return (
          <ActivityCard
            key={item.id}
            item={item}
            category={category || 'Задания'}
            date={result?.info.date ?? item.records?.since ?? item.fullDate ?? item.date}
            description={introParagraph(TASKS[taskId]?.intro) ?? task?.description}
            details={details}
            onOpen={() => done ? onOpenResult?.(item.id) : onOpenTask?.(item.id)}
            onMenu={onCardMenu}
            {...pick}
          />
        );
      }}
      onRemind={onRemind}
      selected={selected}
      onPick={onPick}
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
      renderCard={(item, pick) => <DoneTaskRow key={item.id} item={item} resultId={item.id} onOpen={(t) => onOpen(t.id)} {...pick} />}
    />
  );
}

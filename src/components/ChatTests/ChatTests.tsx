import type { ReactNode } from 'react';
import { EmptyState } from '../EmptyState/EmptyState';
import { IconTabPractices, IconTabTests } from '../icons';
import type { PickProps } from '../ChatCase/ChatCase';
import { StatusRow } from './StatusRow';
import { findClientResult } from '../../data/clientResults';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { CLIENT_CHAT, itemsWithStatus, useClientData } from '../../data/clientStore';
import { clientResultId } from '../../data/resultLinks';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { useTaskResult, useTaskResults } from '../../data/selfTask';
import { useSelfResults } from '../../data/selfTest';
import { plural } from '../../data/taskValues';
import type { PsyTest, TestStatus } from '../../data/tests';
import { waitingText } from '../../data/waiting';
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
  { status: 'done', title: 'Завершённые' },
];

const TASK_SECTIONS: SectionConfig[] = [
  { status: 'sent', title: 'Отправленные', remind: true },
  { status: 'permanent', title: 'Постоянные' },
  { status: 'done', title: 'Завершённые' },
];

/** Отправленное: время справа вверху (сегодня — часы, раньше — дата) и сколько ждёт ответа */
function sentWhen(item: PsyTest): string {
  return item.fullDate && waitingText(item.fullDate) === 'Сегодня' ? (item.time ?? item.fullDate) : (item.fullDate ?? item.date);
}
function sentFacts(item: PsyTest): string {
  if (!item.fullDate) return 'Ждёт ответа';
  const waiting = waitingText(item.fullDate);
  return waiting === 'Сегодня' ? 'Ждёт ответа' : `Ждёт ${waiting}`;
}

/** Описание задания из библиотеки: в самом элементе у постоянного задания и записи там счётчик («Записей: 2 из 10», «Запись 2») */
const taskDescription = (taskId: string | undefined) => TASK_LIBRARY.find((t) => t.id === taskId)?.description;

/** Постоянное задание: сколько записей уже сделано и когда назначено */
function PermanentRow({ item, onOpen, ...pick }: PickProps & { item: PsyTest; onOpen: (item: PsyTest) => void }) {
  const count = item.records?.count ?? 0;
  const since = item.records?.since ?? item.fullDate;
  const counts = /^Записей/.test(item.description) ? item.description : `${plural(count, ['Запись', 'Записи', 'Записей'])}: ${count}`;
  return <StatusRow item={item} description={taskDescription(item.id)} facts={counts} time={since} onOpen={onOpen} {...pick} />;
}

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
              <span className="chat-tests__count">{list.length}</span>
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
  /** Отмеченные карточки (null — выбора нет) и отметка карточки */
  selected?: string[] | null;
  onPick?: (id: string) => void;
  /** Напомнить клиенту о том, что ждёт ответа */
  onRemind?: (items: PsyTest[]) => void;
}

/** Вкладка «Опросники» в открытом чате: отправленный тест открывает его настройку, пройденный — результат клиента */
export function ChatTests({
  hasData,
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
    <SectionedList
      items={hasData ? itemsWithStatus(data, 'test') : []}
      sections={TEST_SECTIONS}
      empty={{ kind: 'test', title: 'Тесты ещё не отправлялись', text: 'Отправьте тест из раздела «Диагностика» — он появится здесь.' }}
      renderCard={(item, pick) =>
        item.status === 'done' ? (
          <StatusRow key={item.id} item={item} facts="Пройден" time={findClientResult(clientResultId(CLIENT_CHAT, item.id))?.data?.info.date ?? item.fullDate ?? item.date} badgeLabel="Пройден" onOpen={(t) => onOpenResult?.(t.id)} {...pick} />
        ) : (
          <StatusRow key={item.id} item={item} facts={sentFacts(item)} time={sentWhen(item)} onOpen={(t) => onOpenTest?.(t.id)} {...pick} />
        )
      }
      onRemind={onRemind}
      selected={selected}
      onPick={onPick}
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
    <SectionedList
      items={items}
      sections={TEST_SECTIONS.filter((s) => s.status === 'done')}
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
        if (item.status === 'done') {
          return <DoneTaskRow key={item.id} item={item} resultId={clientResultId(CLIENT_CHAT, item.id)} onOpen={(t) => onOpenResult?.(t.id)} {...pick} />;
        }
        if (item.status === 'permanent') return <PermanentRow key={item.id} item={item} onOpen={(t) => onOpenTask?.(t.id)} {...pick} />;
        return <StatusRow key={item.id} item={item} facts={sentFacts(item)} time={sentWhen(item)} onOpen={(t) => onOpenTask?.(t.id)} {...pick} />;
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

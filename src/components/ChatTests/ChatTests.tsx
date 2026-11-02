import type { ReactNode } from 'react';
import { EmptyState } from '../EmptyState/EmptyState';
import { IconTabPractices, IconTabTests } from '../icons';
import type { PickProps } from '../ChatCase/ChatCase';
import { DoneTaskCard } from './DoneTaskCard';
import { Facts, ItemCard } from './ItemCard';
import { TestGlance } from './TestGlance';
import { findClientResult } from '../../data/clientResults';
import { CLIENT_CHAT, itemsWithStatus, useClientData } from '../../data/clientStore';
import type { ConclusionData } from '../../data/conclusions';
import { clientResultId } from '../../data/resultLinks';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { useTaskResults } from '../../data/selfTask';
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

/** Карточка отправленного: когда ушла и сколько ждёт ответа; плитка «Напомнить» пишет клиенту в чат */
function SentCard({ item, onOpen, onRemind, ...pick }: PickProps & { item: PsyTest; onOpen: (item: PsyTest) => void; onRemind?: (items: PsyTest[]) => void }) {
  return (
    <ItemCard item={item} caption={item.description} date={item.date} action={{ label: 'Напомнить', onClick: () => onRemind?.([item]) }} onOpen={onOpen} {...pick}>
      {item.fullDate && (
        <Facts
          items={[
            { value: waitingText(item.fullDate), label: 'Ждёт ответа' },
            { value: item.fullDate, label: item.time ? `Отправлено в ${item.time}` : 'Отправлено' },
          ]}
        />
      )}
    </ItemCard>
  );
}

/** Карточка постоянного задания: сколько записей уже сделано, когда последняя и когда назначено; «Выполнить» открывает задание */
function PermanentCard({ item, onOpen, ...pick }: PickProps & { item: PsyTest; onOpen: (item: PsyTest) => void }) {
  const count = item.records?.count ?? 0;
  const facts = [
    { value: String(count), label: plural(count, ['Запись', 'Записи', 'Записей']) },
    ...(item.records?.last ? [{ value: item.records.last, label: 'Последняя' }] : []),
    { value: item.records?.since ?? item.fullDate ?? '', label: 'Назначено' },
  ].filter((f) => f.value);
  return (
    <ItemCard
      item={item}
      caption={TASK_LIBRARY.find((t) => t.id === item.id)?.description ?? item.description}
      date={item.date}
      action={{ label: 'Выполнить', primary: true, onClick: () => onOpen(item) }}
      onOpen={onOpen}
      {...pick}
    >
      <Facts items={facts} />
    </ItemCard>
  );
}

/** Карточка пройденного теста: когда пройден и итог по шкалам (у теста без подсчёта итога нет); «Посмотреть» открывает заключение */
function DoneTestCard({ item, data, onOpen, ...pick }: PickProps & { item: PsyTest; data?: ConclusionData; onOpen: (item: PsyTest) => void }) {
  return (
    <ItemCard item={item} caption={`Пройден ${data?.info.date ?? item.fullDate ?? item.date}`} action={{ label: 'Посмотреть', onClick: () => onOpen(item) }} onOpen={onOpen} {...pick}>
      {data && <TestGlance data={data} />}
    </ItemCard>
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
              {/* Одному элементу хватает плитки «Напомнить» в его карточке */}
              {remind && list.length > 1 && (
                <button type="button" className="chat-tests__remind" onClick={() => onRemind?.(list)}>
                  Напомнить всем
                </button>
              )}
            </div>
            <ul className="chat-tests__cards">{list.map((item) => renderCard(item, pickProps(item.id)))}</ul>
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
          <DoneTestCard key={item.id} item={item} data={findClientResult(clientResultId(CLIENT_CHAT, item.id))?.data} onOpen={(t) => onOpenResult?.(t.id)} {...pick} />
        ) : (
          <SentCard key={item.id} item={item} onOpen={(t) => onOpenTest?.(t.id)} onRemind={onRemind} {...pick} />
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
      renderCard={(item, pick) => <DoneTestCard key={item.id} item={item} data={results.find((r) => r.id === item.id)?.data} onOpen={(t) => onOpen(t.id)} {...pick} />}
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
          return <DoneTaskCard key={item.id} item={item} resultId={clientResultId(CLIENT_CHAT, item.id)} onOpen={(t) => onOpenResult?.(t.id)} {...pick} />;
        }
        if (item.status === 'permanent') return <PermanentCard key={item.id} item={item} onOpen={(t) => onOpenTask?.(t.id)} {...pick} />;
        return <SentCard key={item.id} item={item} onOpen={(t) => onOpenTask?.(t.id)} onRemind={onRemind} {...pick} />;
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
      renderCard={(item, pick) => <DoneTaskCard key={item.id} item={item} resultId={item.id} onOpen={(t) => onOpen(t.id)} {...pick} />}
    />
  );
}

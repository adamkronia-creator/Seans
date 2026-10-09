import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { Chip } from '../Chip/Chip';
import { EditSheet } from '../EditSheet/EditSheet';
import { QuickEdit } from '../QuickEdit/QuickEdit';
import { SwipePager } from '../SwipePager/SwipePager';
import { TruncatedText } from '../TruncatedText/TruncatedText';
import {
  IconCaseEdit,
  IconEventInvite,
  IconChevron,
  IconStatNotes,
  IconStatSessions,
  IconStatTasks,
  IconStatTests,
  IconTabNotes,
  IconTlClock,
  IconTlDoc,
  IconTlFlame,
  IconTlNote,
} from '../icons';
import { CHATS, CURRENT_USER } from '../../data/chats';
import { parseBlocks, RichBlocks } from '../../utils/richText';
import { useDoubleActivate } from '../../utils/useDoubleActivate';
import { clientResultPath } from '../../data/resultLinks';
import { navigate } from '../../router';
import { followChips } from '../../utils/followChips';
import { revealChip } from '../../utils/revealChip';
import { paragraphsToText, textToParagraphs } from '../../data/case';
import {
  countOf,
  doneCount,
  historyEvents,
  setComment,
  updateNote,
  updateSessionText,
  useClientData,
  type HistoryEvent,
  type HistoryFilter,
} from '../../data/clientStore';
import './ChatHistory.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'session', label: 'Сеансы' },
  { id: 'test', label: 'Тесты' },
  { id: 'task', label: 'Задания' },
  { id: 'note', label: 'Заметки' },
];

interface StatRow {
  Icon: Icon;
  label: string;
  value: number;
  total?: number;
}

function Stats({ hasData }: { hasData: boolean }) {
  const d = useClientData();
  const n = (value: number) => (hasData ? value : 0);
  const rows: StatRow[] = [
    { Icon: IconStatSessions, label: 'Сеансов проведено', value: n(countOf(d, 'session')) },
    { Icon: IconStatTests, label: 'Тестов пройдено', value: n(doneCount(d, 'test')), total: n(countOf(d, 'test')) },
    { Icon: IconStatTasks, label: 'Заданий выполнено', value: n(doneCount(d, 'task')), total: n(countOf(d, 'task')) },
    { Icon: IconTabNotes, label: 'Сведений добавлено', value: n(d.caseSections.length) },
    { Icon: IconStatNotes, label: 'Оставлено заметок', value: n(countOf(d, 'note')) },
  ];
  return (
    <ul className="hist-stats">
      {rows.map(({ Icon, label, value, total }) => (
        <li key={label} className="hist-stats__row">
          <Icon className="hist-stats__icon" />
          <span className="hist-stats__label">{label}</span>
          <span className={`hist-stats__value${total === undefined ? ' hist-stats__value--plain' : ''}`}>
            {value}
            {total !== undefined && <span className="hist-stats__total">из {total}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

const maxim = CHATS.find((c) => c.id === 'maxim')!;

function Marker({ event }: { event: HistoryEvent }) {
  if (event.kind === 'invite') {
    return (
      <div className="hist-marker hist-marker--event">
        <span className="hist-marker__slot">
          <IconEventInvite />
        </span>
        <img className="hist-marker__avatar" src={maxim.avatar} alt="" />
      </div>
    );
  }
  if (event.kind === 'session') {
    return (
      <div className="hist-marker hist-marker--session">
        <span className="hist-marker__number">
          <span className="hist-marker__digit">{event.number}</span>
        </span>
        <img className="hist-marker__avatar" src={CURRENT_USER.avatar} alt="" />
        <img className="hist-marker__avatar hist-marker__avatar--ring" src={maxim.avatar} alt="" />
      </div>
    );
  }
  if (event.kind === 'note') {
    return (
      <div className="hist-marker hist-marker--note">
        <IconTlNote className="hist-marker__icon" />
        <img className="hist-marker__avatar" src={CURRENT_USER.avatar} alt="" />
      </div>
    );
  }
  const done = event.state === 'done';
  const StateIcon = done ? (event.kind === 'test' ? IconTlDoc : IconTlFlame) : IconTlClock;
  return (
    <div className="hist-marker hist-marker--event">
      <span className={`hist-marker__slot${done ? '' : ' hist-marker__slot--clock'}`}>
        <StateIcon />
      </span>
      <img
        className="hist-marker__avatar"
        src={done ? maxim.avatar : CURRENT_USER.avatar}
        alt=""
      />
    </div>
  );
}

function Card({ event, onEdit }: { event: HistoryEvent; onEdit: () => void }) {
  const [quick, setQuick] = useState(false);
  const title = event.kind === 'session' ? `Сеанс №${event.number}` : event.title;
  // Сеанс без текста: только название и дата
  const bare = 'paragraphs' in event && event.paragraphs.length === 0 && !quick;
  // Двойной клик/касание: быстрая правка текста или комментария на месте (у приглашения текста нет);
  // полный редактор открывает карандаш
  const doubleTap = useDoubleActivate(() => setQuick(true), event.kind !== 'invite' && !quick);
  const saveQuick = (text: string) => {
    setQuick(false);
    if (event.kind === 'session') {
      if (text !== paragraphsToText(event.paragraphs)) updateSessionText(event.ref, textToParagraphs(text));
    } else if (event.kind === 'note') {
      if (text !== paragraphsToText(event.paragraphs)) updateNote(event.ref, { paragraphs: textToParagraphs(text) });
    } else if (event.kind !== 'invite') {
      if (text !== (event.comment ?? '')) setComment(event.id, text);
    }
  };
  // Выполненный клиентом тест открывает его результат
  const resultPath = event.kind === 'test' && event.state === 'done' ? clientResultPath('maxim', event.ref) : undefined;
  return (
    <div className={`hist-card${bare ? ' hist-card--bare' : ''}`} {...doubleTap}>
      <div className="hist-card__top">
        {event.kind === 'test' || event.kind === 'task' ? (
          <TruncatedText className="hist-card__title hist-card__title--single" text={title} />
        ) : (
          <h3 className="hist-card__title">{title}</h3>
        )}
        {event.kind !== 'invite' && (
          <button
            type="button"
            className="hist-card__edit"
            aria-label={event.kind === 'test' || event.kind === 'task' ? 'Комментарий' : 'Изменить текст'}
            onClick={onEdit}
          >
            <IconCaseEdit />
          </button>
        )}
      </div>
      <p className="hist-card__date">
        {event.date.split(' ').map((part) => (
          <span key={part}>{part}</span>
        ))}
      </p>
      {'text' in event ? (
        <>
          <div
            className={`hist-card__event${resultPath ? ' hist-card__event--link' : ''}`}
            {...(resultPath
              ? { role: 'link', tabIndex: 0, onClick: () => navigate(resultPath), onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && navigate(resultPath) }
              : {})}
          >
            <p className="hist-card__text">{event.text}</p>
            {event.kind !== 'invite' && <IconChevron className="hist-card__chevron" />}
          </div>
          {event.kind !== 'invite' && (
            <QuickEdit
              editing={quick}
              separator={'\n'}
              onCancel={() => setQuick(false)}
              onCommit={saveQuick}
            >
              {event.comment ? (
                <RichBlocks
                  blocks={parseBlocks(event.comment)}
                  textClass="hist-card__text hist-card__comment"
                />
              ) : (
                quick && (
                  <p className="hist-card__text hist-card__comment">
                    <br />
                  </p>
                )
              )}
            </QuickEdit>
          )}
        </>
      ) : (
        <QuickEdit
          editing={quick}
          className="hist-flow"
          onCancel={() => setQuick(false)}
          onCommit={saveQuick}
        >
          <RichBlocks blocks={parseBlocks(paragraphsToText(event.paragraphs))} textClass="hist-card__text" />
          {quick && event.paragraphs.length === 0 && (
            <p className="hist-card__text">
              <br />
            </p>
          )}
        </QuickEdit>
      )}
    </div>
  );
}

/** События одного фильтра: страница пейджера. Своей прокрутки у неё нет, листает весь раздел */
const HistoryList = memo(function HistoryList({ events, onEdit }: { events: HistoryEvent[]; onEdit: (id: string) => void }) {
  return (
    <div className="hist-page">
      {events.length > 0 ? (
        <ol className="hist-timeline">
          {events.map((event, i) => {
            const hasNext = i < events.length - 1;
            return (
              <li key={event.id} className={`hist-item hist-item--${event.kind}`}>
                <div className="hist-rail">
                  <Marker event={event} />
                  {hasNext && <span className="hist-item__line" aria-hidden="true" />}
                </div>
                <Card event={event} onEdit={() => onEdit(event.id)} />
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="hist-empty">Событий пока нет</p>
      )}
    </div>
  );
});

/**
 * Вкладка «История взаимодействия» в открытом чате: статистика, фильтры и лента событий.
 * Ленты разных фильтров — страницы пейджера: их можно листать пальцем, как разделы чата, а чипсы идут следом.
 * Пейджер вложенный: с последней ленты (и с первой, если листать назад) тот же жест листает уже разделы чата.
 */
export function ChatHistory({ hasData }: { hasData: boolean }) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const data = useClientData();
  const events = useMemo(() => (hasData ? historyEvents(data) : []), [hasData, data]);
  const editing = events.find((e) => e.id === editingId);

  const pages = useMemo(
    () =>
      FILTERS.map(({ id }) => ({
        key: id,
        node: <HistoryList events={id === 'all' ? events : events.filter((e) => e.kind === id)} onEdit={setEditingId} />,
      })),
    [events],
  );

  const index = FILTERS.findIndex((item) => item.id === filter);
  const shown = dragIndex ?? index;

  const onDrag = useCallback((position: number | null) => {
    setDragIndex(position === null ? null : Math.round(Math.min(FILTERS.length - 1, Math.max(0, position))));
  }, []);

  // Цвет чипсов идёт за положением страниц, а не прыгает на середине
  const onPosition = useCallback((position: number) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.hist-chips .chip');
    if (chips) followChips(chips, position);
  }, []);

  // Выбранный чипс виден целиком, даже если до него пролистали пальцем
  useEffect(() => {
    const row = root.current?.querySelector<HTMLElement>('.hist-chips');
    const chip = row?.querySelector<HTMLElement>('.chip--active');
    if (row && chip) revealChip(row, chip);
  }, [shown]);

  // Статистика и чипсы стоят над лентами: не едут вместе с ними, но за них тоже можно листать
  const header = (
    <>
      <Stats hasData={hasData} />

      <div className="hist-chips" role="group" aria-label="Фильтр событий" data-hscroll>
        {FILTERS.map(({ id, label }, i) => (
          <Chip
            key={id}
            follow
            active={shown === i}
            count={hasData ? countOf(data, id) : 0}
            onClick={() => setFilter(id)}
          >
            {label}
          </Chip>
        ))}
      </div>
    </>
  );

  return (
    <div ref={root} className="chat-history">
      <SwipePager
        className="chat-history__pager"
        autoHeight
        nested
        index={index}
        pages={pages}
        header={header}
        onIndexChange={(i) => setFilter(FILTERS[i].id)}
        onPosition={onPosition}
        onDrag={onDrag}
      />

      {editing && (
        <EditSheet
          key={editing.id}
          heading={
            editing.kind === 'session'
              ? `Текст сеанса №${editing.number}`
              : editing.kind === 'note'
                ? 'Текст заметки'
                : 'Комментарий'
          }
          initial={{
            text:
              editing.kind === 'session' || editing.kind === 'note'
                ? paragraphsToText(editing.paragraphs)
                : editing.kind === 'invite'
                  ? ''
                  : (editing.comment ?? ''),
          }}
          textPlaceholder={
            editing.kind === 'session'
              ? 'Что произошло на сеансе'
              : 'Добавьте комментарий'
          }
          onClose={() => setEditingId(null)}
          onSave={({ text = '' }) => {
            if (editing.kind === 'session') updateSessionText(editing.ref, textToParagraphs(text));
            else if (editing.kind === 'note') updateNote(editing.ref, { paragraphs: textToParagraphs(text) });
            else if (editing.kind !== 'invite') setComment(editing.id, text);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

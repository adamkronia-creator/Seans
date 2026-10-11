import type React from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../Chip/Chip';
import { EditSheet } from '../EditSheet/EditSheet';
import { QuickEdit } from '../QuickEdit/QuickEdit';
import { SwipePager } from '../SwipePager/SwipePager';
import {
  IconCaseEdit,
  IconEventInvite,
  IconChevron,
  IconTlClock,
  IconTlDoc,
  IconTlFlame,
  IconTlNote,
} from '../icons';
import { CHATS } from '../../data/chats';
import { parseBlocks, RichBlocks } from '../../utils/richText';
import { useDoubleActivate } from '../../utils/useDoubleActivate';
import { clientResultId, clientResultPath } from '../../data/resultLinks';
import { findClientResult } from '../../data/clientResults';
import { levelOf, type ConclusionData, type ConclusionScale } from '../../data/conclusions';
import { navigate } from '../../router';
import { followChips } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
import { ScrollHost } from '../ScrollHost/ScrollHost';
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

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'session', label: 'Сеансы' },
  { id: 'test', label: 'Тесты' },
  { id: 'task', label: 'Задания' },
  { id: 'note', label: 'Заметки' },
];

interface StatItem {
  label: string;
  value: number;
  total?: number;
}

/** Сводка в одну строку: число крупно, под ним подпись; у тестов и заданий «выполнено / всего» */
function Stats({ hasData }: { hasData: boolean }) {
  const d = useClientData();
  const n = (value: number) => (hasData ? value : 0);
  const items: StatItem[] = [
    { label: 'Сеансы', value: n(countOf(d, 'session')) },
    { label: 'Тесты', value: n(doneCount(d, 'test')), total: n(countOf(d, 'test')) },
    { label: 'Задания', value: n(doneCount(d, 'task')), total: n(countOf(d, 'task')) },
    { label: 'Сведения', value: n(d.caseSections.length) },
    { label: 'Заметки', value: n(countOf(d, 'note')) },
  ];
  return (
    <ul className="hist-stats">
      {items.map(({ label, value, total }) => (
        <li key={label} className="hist-stats__item" title={total !== undefined ? `${label}: выполнено ${value} из ${total}` : undefined}>
          <span className="hist-stats__value">
            {value}
            {total !== undefined && <span className="hist-stats__total">/{total}</span>}
          </span>
          <span className="hist-stats__label">{label}</span>
        </li>
      ))}
    </ul>
  );
}

const maxim = CHATS.find((c) => c.id === 'maxim')!;

/** Кто сделал: подпись у даты вместо аватарок под значком */
function authorOf(event: HistoryEvent) {
  const client = maxim.name.split(' ')[0];
  if (event.kind === 'invite') return client;
  if (event.kind === 'session') return `Вы и ${client}`;
  if (event.kind === 'note') return 'Вы';
  return event.state === 'done' ? client : 'Вы';
}

/** Значок события на рейке: номер сеанса или значок типа */
function Marker({ event }: { event: HistoryEvent }) {
  if (event.kind === 'invite') {
    return (
      <div className="hist-marker">
        <IconEventInvite />
      </div>
    );
  }
  if (event.kind === 'session') {
    return (
      <div className="hist-marker">
        <span className="hist-marker__number">
          <span className="hist-marker__digit">{event.number}</span>
        </span>
      </div>
    );
  }
  if (event.kind === 'note') {
    return (
      <div className="hist-marker">
        <IconTlNote />
      </div>
    );
  }
  const done = event.state === 'done';
  const StateIcon = done ? (event.kind === 'test' ? IconTlDoc : IconTlFlame) : IconTlClock;
  return (
    <div className={`hist-marker${done ? '' : ' hist-marker--clock'}`}>
      <StateIcon />
    </div>
  );
}

/** Сколько шкал видно, пока список свернут */
const SCALES_SHOWN = 3;

const fmtScore = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Одна шкала: название, значение и полоса цвета диапазона; у шкалы с диапазонами под названием подпись диапазона */
function ScaleRow({ data, scale }: { data: ConclusionData; scale: ConclusionScale }) {
  const level = scale.leveled ? levelOf(data, scale.score, scale) : undefined;
  const tone = level?.tone ?? 'accent';
  const pct = Math.min(100, Math.max(0, (scale.score / scale.max) * 100));
  return (
    <li className="hist-scale">
      <span className="hist-scale__head">
        <span className="hist-scale__name">
          {scale.name} <span className="hist-scale__code">({scale.code})</span>
          {level && <span className="hist-scale__code"> · {level.chip.toLowerCase()}</span>}
        </span>
        <span className="hist-scale__value">{fmtScore(scale.score)}</span>
      </span>
      <span className="hist-scale__track" aria-hidden="true">
        <span className={`hist-scale__fill cc-fill--${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}

/**
 * Шкалы пройденного клиентом теста в карточке истории. Нажатие на шкалы открывает результат тестирования;
 * если шкал больше трех, остальные прячутся за «Читать далее» (кнопка стоит рядом со списком, чтобы не открывать результат).
 */
function ScaleList({ data, resultPath }: { data: ConclusionData; resultPath: string }) {
  const [open, setOpen] = useState(false);
  const { scales } = data;
  const long = scales.length > SCALES_SHOWN;
  const shown = long && !open ? scales.slice(0, SCALES_SHOWN) : scales;
  return (
    <div className="hist-scales">
      <ul
        className="hist-scales__list"
        role="link"
        tabIndex={0}
        aria-label="Открыть результат тестирования"
        onClick={() => navigate(resultPath)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(resultPath)}
      >
        {shown.map((scale) => (
          <ScaleRow key={scale.code} data={data} scale={scale} />
        ))}
      </ul>
      {long && (
        <button type="button" className="hist-scales__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Скрыть' : `Читать далее (еще ${scales.length - SCALES_SHOWN})`}
        </button>
      )}
    </div>
  );
}

function Card({ event, onEdit }: { event: HistoryEvent; onEdit: () => void }) {
  const [quick, setQuick] = useState(false);
  const title = event.kind === 'session' ? `Сеанс №${event.number}` : event.title;
  // Сеанс без текста: только название и дата
  const bare = 'paragraphs' in event && event.paragraphs.length === 0 && !quick;
  // Тест или задание, которое отправили или назначили вы: клиент его еще не выполнил, комментировать и открывать нечего
  const outgoing = (event.kind === 'test' || event.kind === 'task') && event.state !== 'done';
  // Править можно все, кроме приглашения и отправленного: двойной клик/касание — быстрая правка текста или комментария
  // на месте, полный редактор открывает карандаш
  const editable = event.kind !== 'invite' && !outgoing;
  const doubleTap = useDoubleActivate(() => setQuick(true), editable && !quick);
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
  const scaleData = resultPath && event.kind === 'test' ? findClientResult(clientResultId('maxim', event.ref))?.data : undefined;
  return (
    <div className={`hist-card${bare ? ' hist-card--bare' : ''}`} {...doubleTap}>
      <div className="hist-card__top">
        <h3 className={`hist-card__title${event.kind === 'test' || event.kind === 'task' ? ' hist-card__title--single' : ''}`}>{title}</h3>
        {editable && (
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
        <span>{authorOf(event)}</span>
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
            {editable && <IconChevron className="hist-card__chevron" />}
          </div>
          {resultPath && scaleData && scaleData.scales.length > 0 && <ScaleList data={scaleData} resultPath={resultPath} />}
          {editable && (
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
  const events = useMemo(() => (hasData ? historyEvents(data).reverse() : []), [hasData, data]);
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
    // Ряд чипсов едет за страницами: активный остаётся посередине
    const row = root.current?.querySelector<HTMLElement>('.hist-chips');
    if (row) centerChips(row, position);
  }, []);

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
    <div ref={root} className="hist-host">
      <ScrollHost className="chat-history">
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
      </ScrollHost>

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

import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { Chip } from '../Chip/Chip';
import { EmptyState } from '../EmptyState/EmptyState';
import { EditSheet } from '../EditSheet/EditSheet';
import { QuickEdit } from '../QuickEdit/QuickEdit';
import { SwipePager } from '../SwipePager/SwipePager';
import {
  IconCaseEdit,
  IconChevron,
  IconTabLibrary,
} from '../icons';
import markerPending from '../../assets/icons/history/pending.svg';
import markerTest from '../../assets/icons/history/test.svg';
import markerTask from '../../assets/icons/history/task.svg';
import markerNote from '../../assets/icons/history/note.svg';
import markerInvite from '../../assets/icons/history/invite.svg';
import { Avatar } from '../Avatar/Avatar';
import { useChat } from '../../data/chatStore';
import { useAvatarSrc } from '../../data/profile';
import { CHATS } from '../../data/chats';
import { parseBlocks, RichBlocks } from '../../utils/richText';
import { useDoubleActivate } from '../../utils/useDoubleActivate';
import { clientResultId, clientResultPath, recordRef } from '../../data/resultLinks';
import { findClientResult } from '../../data/clientResults';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { ScaleList } from './ScaleList';
import { navigate } from '../../router';
import { centerChips } from '../../utils/centerChips';
import { followChips, type PositionVia } from '../../utils/followChips';
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

/** Одиночные субпиксельные колебания при прокрутке не меняют направление. */
const FILTER_SCROLL_DELTA = 8;

const maxim = CHATS.find((c) => c.id === 'maxim')!;

/** Значок события на рейке. У сеанса сохраняется его номер. */
function Marker({ event }: { event: HistoryEvent }) {
  if (event.kind === 'session') {
    return (
      <div className="hist-marker hist-marker--session">
        <span className="hist-marker__number">
          <span className="hist-marker__digit">{event.number}</span>
        </span>
      </div>
    );
  }
  const src = event.kind === 'invite' ? markerInvite
    : event.kind === 'note' ? markerNote
      : event.state !== 'done' ? markerPending
        : event.kind === 'test' ? markerTest : markerTask;
  return <img className="hist-marker hist-marker--asset" src={src} alt="" />;
}

function Card({ event, onEdit }: { event: HistoryEvent; onEdit: () => void }) {
  const [quick, setQuick] = useState(false);
  const title = event.kind === 'session' ? `Сеанс №${event.number}` : event.kind === 'note'
    ? event.title.replace(/^Заметка:\s*/i, '').replace(/^«(.*)»$/, '$1')
    : event.kind === 'task' ? event.title.replace(/^«(.*)»$/, '$1') : event.title;
  // Сеанс без текста: только название и дата
  const bare = 'paragraphs' in event && event.paragraphs.length === 0 && !quick;
  // Тест или задание, которое отправили или назначили вы: клиент его ещё не выполнил, комментировать и открывать нечего
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
  // Выполненный клиентом тест или задание открывает его результат (у заданий он есть не у всех); у записи постоянного задания результат свой
  const resultRef = event.kind === 'task' && event.record ? recordRef(event.ref, event.record) : event.kind === 'test' || event.kind === 'task' ? event.ref : '';
  const resultPath =
    (event.kind === 'test' || (event.kind === 'task' && findClientTaskResult(clientResultId('maxim', resultRef)))) && event.state === 'done'
      ? clientResultPath('maxim', resultRef)
      : undefined;
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
        {event.kind === 'invite' && <span>{maxim.name.split(' ')[0]}</span>}
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
            {editable && event.kind === 'task' && <IconChevron className="hist-card__chevron" />}
          </div>
          {resultPath && scaleData && scaleData.scales.length > 0 && <ScaleList data={scaleData} grouping={resultRef === '5pfq' ? 'factors' : 'main-extra'} onOpen={() => navigate(resultPath)} />}
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

/**
 * События одного фильтра: страница пейджера со своей прокруткой. Как в переписке, свежее внизу и лента открывается на конце;
 * пока событий мало, они лежат у чипсов, а не у верха. У каждого фильтра свой конец и своя прокрутка, поэтому при смене фильтра
 * ничего не сдвигается по вертикали: страницы только скользят вбок.
 */
const HistoryList = memo(function HistoryList({ events, onEdit }: { events: HistoryEvent[]; onEdit: (id: string) => void }) {
  const ownAvatar = useAvatarSrc();
  const clientAvatar = useChat(maxim.id)?.avatar ?? maxim.avatar;
  return (
    <ScrollHost className="chat-history" anchorEnd>
      <div className="hist-page">
        {events.length > 0 ? (
          <ol className="hist-timeline">
            {events.map((event, i) => {
              const hasNext = i < events.length - 1;
              const byClient = event.kind === 'invite' || ('state' in event && event.state === 'done');
              return (
                <li key={event.id} className={`hist-item hist-item--${event.kind}`}>
                  <div className="hist-rail">
                    <Marker event={event} />
                    <div className="hist-rail__avatars">
                      {event.kind === 'session' ? (
                        <>
                          <Avatar src={ownAvatar} alt="Вы" />
                          <Avatar src={clientAvatar} alt={maxim.name} />
                        </>
                      ) : (
                        <Avatar
                          src={byClient ? clientAvatar : ownAvatar}
                          alt={byClient ? maxim.name : 'Вы'}
                        />
                      )}
                    </div>
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
    </ScrollHost>
  );
});

/**
 * Вкладка «История взаимодействия» в открытом чате: лента событий (свежие внизу), под ней чипсы-фильтры, в самом низу учёт.
 * При движении к старым событиям ряд уходит вниз, а при движении к новым возвращается.
 * Ленты разных фильтров — страницы пейджера: их можно листать пальцем, как разделы чата, а чипсы идут следом.
 * Пейджер вложенный: с последней ленты (и с первой, если листать назад) тот же жест листает уже разделы чата.
 */
export function ChatHistory({ hasData }: { hasData: boolean }) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new WeakMap<HTMLElement, { top: number; end: number }>());
  const [filtersHidden, setFiltersHidden] = useState(false);
  const data = useClientData();
  const events = useMemo(() => (hasData ? historyEvents(data) : []), [hasData, data]);
  const editing = events.find((e) => e.id === editingId);

  // Число у каждого вида — прямо на чипсе: сеансы и заметки считаются, у тестов и заданий «выполнено / всего»
  const n = (value: number) => (hasData ? value : 0);
  const counts: Partial<Record<HistoryFilter, { value: number; total?: number }>> = {
    session: { value: n(countOf(data, 'session')) },
    test: { value: n(doneCount(data, 'test')), total: n(countOf(data, 'test')) },
    task: { value: n(doneCount(data, 'task')), total: n(countOf(data, 'task')) },
    note: { value: n(countOf(data, 'note')) },
  };

  // Панель чипсов лежит поверх лент (absolute): её высоту отдаём лентам, чтобы они кончались над ней
  useEffect(() => {
    const host = root.current;
    const foot = host?.querySelector<HTMLElement>('.hist-foot');
    if (!host || !foot) return;
    const apply = () => host.style.setProperty('--foot-h', `${Math.round(foot.getBoundingClientRect().height)}px`);
    const observer = new ResizeObserver(apply);
    observer.observe(foot);
    apply();
    return () => observer.disconnect();
  }, [events.length === 0]);

  const pages = useMemo(
    () =>
      FILTERS.map(({ id }) => ({
        key: id,
        node: <HistoryList events={id === 'all' ? events : events.filter((e) => e.kind === id)} onEdit={setEditingId} />,
      })),
    [events],
  );

  useEffect(() => {
    const scroller = root.current?.querySelector<HTMLElement>('.chat-history__pager > .swipe-pager__track > .swipe-pager__page:not([inert]) .chat-history');
    if (!scroller) return;
    const remember = () => {
      const end = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scrollPositions.current.set(scroller, { top: Math.min(end, Math.max(0, scroller.scrollTop)), end });
    };
    remember();
    const observer = new ResizeObserver(remember);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => observer.disconnect();
  }, [filter, events.length === 0]);

  const index = FILTERS.findIndex((item) => item.id === filter);
  const shown = dragIndex ?? index;

  const onDrag = useCallback((position: number | null) => {
    setDragIndex(position === null ? null : Math.round(Math.min(FILTERS.length - 1, Math.max(0, position))));
  }, []);

  const onPosition = useCallback((position: number, via?: PositionVia) => {
    const list = row.current;
    if (!list) return;
    followChips(list.querySelectorAll<HTMLElement>(':scope > .chip'), position, via);
    centerChips(list, position, '.chip', via);
  }, []);

  const selectFilter = (id: HistoryFilter) => {
    setFiltersHidden(false);
    setFilter(id);
  };

  const onHistoryScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.chat-history:not([inert] *)')) return;
    const end = Math.max(0, target.scrollHeight - target.clientHeight);
    const top = Math.min(end, Math.max(0, target.scrollTop));
    const previous = scrollPositions.current.get(target);
    const nearEnd = end - top <= FILTER_SCROLL_DELTA;
    // При открытии вкладки и изменении высоты ленты событие прокрутки приходит и без жеста.
    if (!previous || previous.end !== end || nearEnd) {
      scrollPositions.current.set(target, { top, end });
      if (nearEnd && filtersHidden) setFiltersHidden(false);
      return;
    }
    if (Math.abs(top - previous.top) < FILTER_SCROLL_DELTA) return;
    scrollPositions.current.set(target, { top, end });
    const hide = top < previous.top;
    if (hide !== filtersHidden) setFiltersHidden(hide);
  };

  const foot = (
    <div ref={row} className="screen-header__chips hist-chips" role="group" aria-label="Фильтр событий" data-hscroll>
      {FILTERS.map(({ id, label }, i) => {
        const c = counts[id];
        return (
          <Chip
            key={id}
            follow
            tone="chat"
            active={shown === i}
            count={c ? (c.total ?? c.value) : undefined}
            onClick={() => selectFilter(id)}
            ariaLabel={c && c.total !== undefined ? `${label}: выполнено ${c.value} из ${c.total}` : c ? `${label}: ${c.value}` : label}
          >
            {label}
          </Chip>
        );
      })}
    </div>
  );

  return (
    <div ref={root} className="hist-host" onScrollCapture={onHistoryScroll}>
      {events.length === 0 ? (
        // Событий нет совсем: подсказка вместо пустых лент и чипсов с нулями
        <EmptyState icon={<IconTabLibrary />} title="История пока пуста" text="Здесь появятся сеансы, тесты, задания и заметки по этому клиенту." />
      ) : (
        <>
          <SwipePager
            className="chat-history__pager"
            nested
            index={index}
            pages={pages}
            onIndexChange={(i) => selectFilter(FILTERS[i].id)}
            onPosition={onPosition}
            onDrag={onDrag}
          />

          <div
            className="hist-foot"
            data-hidden={filtersHidden || undefined}
            aria-hidden={filtersHidden || undefined}
            {...({ inert: filtersHidden ? '' : undefined } as object)}
          >
            {foot}
          </div>
        </>
      )}

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

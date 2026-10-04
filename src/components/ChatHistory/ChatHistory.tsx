import { useState, type ComponentType, type SVGProps } from 'react';
import { Chip } from '../Chip/Chip';
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
import { CASE_SECTIONS } from '../../data/case';
import {
  countOf,
  doneCount,
  historyEvents,
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
    { Icon: IconTabNotes, label: 'Сведений добавлено', value: n(CASE_SECTIONS.length) },
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
        <span className="hist-marker__number">{event.number}</span>
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

function Card({ event }: { event: HistoryEvent }) {
  const title = event.kind === 'session' ? `Сеанс №${event.number}` : event.title;
  return (
    <div className="hist-card">
      <div className="hist-card__top">
        {event.kind === 'test' || event.kind === 'task' ? (
          <TruncatedText className="hist-card__title hist-card__title--single" text={title} />
        ) : (
          <h3 className="hist-card__title">{title}</h3>
        )}
        {event.kind !== 'invite' && (
          <button type="button" className="hist-card__edit" aria-label="Изменить">
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
        <div className="hist-card__event">
          <p className="hist-card__text">{event.text}</p>
          {event.kind !== 'invite' && <IconChevron className="hist-card__chevron" />}
        </div>
      ) : (
        event.paragraphs.map((text, i) => (
          <p key={i} className="hist-card__text">
            {text}
          </p>
        ))
      )}
    </div>
  );
}

/** Вкладка «История взаимодействия» в открытом чате: статистика, фильтры и лента событий */
export function ChatHistory({ hasData }: { hasData: boolean }) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const data = useClientData();
  const events = hasData ? historyEvents(data) : [];
  const visible = filter === 'all' ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="chat-history">
      <Stats hasData={hasData} />

      <div className="hist-chips" role="group" aria-label="Фильтр событий">
        {FILTERS.map(({ id, label }) => (
          <Chip
            key={id}
            active={filter === id}
            count={hasData ? countOf(data, id) : 0}
            onClick={() => setFilter(id)}
          >
            {label}
          </Chip>
        ))}
      </div>

      {visible.length > 0 ? (
        <ol className="hist-timeline">
          {visible.map((event, i) => {
            const hasNext = i < visible.length - 1;
            return (
              <li key={event.id} className={`hist-item hist-item--${event.kind}`}>
                {hasNext && <span className="hist-item__line" aria-hidden="true" />}
                <Marker event={event} />
                <Card event={event} />
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="hist-empty">Событий пока нет</p>
      )}
    </div>
  );
}
